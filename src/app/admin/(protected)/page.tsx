import Link from "next/link";

import {
  analyticsPeriodOptions,
  analyticsPeriodSchema,
  type RevenueTrendPoint,
} from "@/server/admin/analytics-domain";
import { createAdminAnalyticsService } from "@/server/admin/analytics-service";
import { requireUser } from "@/server/auth/authorization";
import { db } from "@/server/db/client";

export const instant = false;

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="border border-[#25231f]/12 bg-white p-5 shadow-[0_18px_45px_rgba(37,35,31,0.04)] sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#25231f]/50">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#25231f]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#25231f]/55">{detail}</p>
    </article>
  );
}

function RevenueTrend({ points, limited }: { points: RevenueTrendPoint[]; limited: boolean }) {
  const max = Math.max(...points.map((point) => point.amountCents), 0);
  if (max === 0) {
    return <p className="mt-7 border border-dashed border-[#25231f]/18 px-5 py-10 text-center text-sm text-[#25231f]/55">No verified payment activity was recorded in this period.</p>;
  }

  return (
    <>
      <div aria-hidden="true" className="mt-7 flex h-56 items-end gap-1.5 border-b border-[#25231f]/15 px-1 sm:gap-2">
        {points.map((point, index) => (
          <div className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2" key={point.key}>
            <div
              className="w-full min-w-1 bg-[#8a5a3b] transition-[height]"
              style={{ height: `${Math.max(4, Math.round((point.amountCents / max) * 190))}px` }}
              title={`${point.label}: ${formatMoney(point.amountCents)}`}
            />
            <span className="h-5 max-w-full truncate text-[9px] text-[#25231f]/45">
              {points.length <= 14 || index % 5 === 0 || index === points.length - 1 ? point.label : ""}
            </span>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Verified payment trend</caption>
        <thead><tr><th>Period</th><th>Gross sales</th><th>Verified payments</th></tr></thead>
        <tbody>{points.map((point) => <tr key={point.key}><th>{point.label}</th><td>{formatMoney(point.amountCents)}</td><td>{point.paymentCount}</td></tr>)}</tbody>
      </table>
      {limited ? <p className="mt-3 text-xs text-[#8a5a3b]">The chart shows the most recent 5,000 verified payment records in this range. KPI totals remain complete.</p> : null}
    </>
  );
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string | string[] }> }) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const period = analyticsPeriodSchema.parse(query.period);
  const dashboard = await createAdminAnalyticsService(db).getDashboard(period);
  const selectedLabel = analyticsPeriodOptions.find((option) => option.value === period)?.label ?? "30 days";
  const metricCards = [
    { label: "Verified gross sales", value: formatMoney(dashboard.financials.grossSalesCents), detail: countLabel(dashboard.financials.verifiedPaymentCount, "captured payment record") },
    { label: "Recorded refunds", value: formatMoney(dashboard.financials.refundCents), detail: "Refund ledger entries recorded in this period" },
    { label: "Net sales", value: formatMoney(dashboard.financials.netSalesCents), detail: "Verified gross sales less recorded refunds" },
    { label: "Paid orders", value: dashboard.financials.paidOrderCount.toLocaleString("en-US"), detail: "Distinct orders with a captured payment" },
    { label: "Average paid order", value: formatMoney(dashboard.financials.averagePaidOrderCents), detail: "Gross sales divided by distinct paid orders" },
    { label: "Orders requiring attention", value: dashboard.attentionOrderCount.toLocaleString("en-US"), detail: "Persisted payment or inventory exceptions" },
    { label: "Inventory alerts", value: (dashboard.inventory.outOfStockCount + dashboard.inventory.lowStockCount).toLocaleString("en-US"), detail: `${countLabel(dashboard.inventory.outOfStockCount, "sold-out variant")} · ${countLabel(dashboard.inventory.lowStockCount, "low-stock variant")}` },
  ];

  return (
    <main className="min-w-0">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a5a3b]">Business overview</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Analytics</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#25231f]/60">
            Verified payment, refund, order, and inventory signals from PostgreSQL. Financial periods use UTC and never infer payment from a browser redirect.
          </p>
        </div>
        <nav aria-label="Analytics period" className="flex w-fit flex-wrap gap-1 border border-[#25231f]/12 bg-white p-1">
          {analyticsPeriodOptions.map((option) => (
            <Link
              aria-current={option.value === period ? "page" : undefined}
              className={`px-3 py-2 text-xs font-medium transition sm:px-4 ${option.value === period ? "bg-[#25231f] text-white" : "text-[#25231f]/65 hover:bg-[#f1eee8]"}`}
              href={option.value === "30d" ? "/admin" : `/admin?period=${option.value}`}
              key={option.value}
              prefetch
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </div>

      <aside className="mt-7 border-l-4 border-[#b77845] bg-[#fff8ed] px-5 py-4 text-sm leading-6 text-[#5d422f]">
        <p className="font-semibold">Sandbox reporting</p>
        <p>Maison Vale currently accepts Stripe test-mode payments only. These figures are portfolio sandbox activity, not production revenue.</p>
      </aside>

      <section aria-labelledby="key-metrics-heading" className="mt-9">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold" id="key-metrics-heading">Key metrics</h2>
          <p className="text-xs text-[#25231f]/50">{selectedLabel} · through {new Date(dashboard.generatedAt).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => <MetricCard {...metric} key={metric.label} />)}
        </div>
      </section>

      <section aria-labelledby="trend-heading" className="mt-10 border border-[#25231f]/12 bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a5a3b]">Revenue signal</p><h2 className="mt-2 text-2xl font-semibold" id="trend-heading">Verified gross sales trend</h2></div>
          <p className="text-xs leading-5 text-[#25231f]/50">Daily for 7 and 30 days, weekly for 90 days, monthly for all time</p>
        </div>
        <RevenueTrend limited={dashboard.trendLimited} points={dashboard.revenueTrend} />
      </section>

      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="top-variants-heading" className="border border-[#25231f]/12 bg-white p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a5a3b]">Snapshot performance</p>
          <h2 className="mt-2 text-2xl font-semibold" id="top-variants-heading">Top purchased variants</h2>
          <p className="mt-2 text-xs leading-5 text-[#25231f]/50">Ranked by units from immutable order-item snapshots, so later catalogue edits do not rewrite history.</p>
          {dashboard.topVariants.length ? (
            <ol className="mt-6 divide-y divide-[#25231f]/10">
              {dashboard.topVariants.map((variant, index) => (
                <li className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4" key={`${variant.productName}-${variant.variantName}-${variant.sku}`}>
                  <span className="text-lg font-semibold text-[#8a5a3b]">{index + 1}</span>
                  <div className="min-w-0"><p className="truncate font-medium">{variant.productName}</p><p className="mt-1 truncate text-xs text-[#25231f]/50">{variant.variantName} · {variant.sku}</p></div>
                  <div className="text-right"><p className="font-semibold">{countLabel(variant.unitsSold, "unit")}</p><p className="mt-1 text-xs text-[#25231f]/50">{formatMoney(variant.merchandiseSalesCents)}</p></div>
                </li>
              ))}
            </ol>
          ) : <p className="mt-6 border border-dashed border-[#25231f]/18 px-5 py-10 text-center text-sm text-[#25231f]/55">No purchased item snapshots are available for this period.</p>}
        </section>

        <section aria-labelledby="inventory-alerts-heading" className="border border-[#25231f]/12 bg-white p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a5a3b]">Current stock</p><h2 className="mt-2 text-2xl font-semibold" id="inventory-alerts-heading">Inventory alerts</h2></div>
            <Link className="text-xs font-semibold underline underline-offset-4" href="/admin/inventory">View inventory</Link>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#25231f]/50">Live stock is intentionally independent of the selected financial period.</p>
          {dashboard.inventory.alerts.length ? (
            <ul className="mt-6 divide-y divide-[#25231f]/10">
              {dashboard.inventory.alerts.map((variant) => (
                <li className="flex items-center justify-between gap-4 py-4" key={variant.variantId}>
                  <div className="min-w-0"><p className="truncate font-medium">{variant.productName}</p><p className="mt-1 truncate text-xs text-[#25231f]/50">{variant.variantName} · {variant.sku}{variant.productPublished ? "" : " · Draft product"}</p></div>
                  <Link className={`shrink-0 px-3 py-2 text-xs font-semibold ${variant.level === "OUT_OF_STOCK" ? "bg-[#6e3028] text-white" : "bg-[#efe2d4] text-[#6b452e]"}`} href={`/admin/inventory?q=${encodeURIComponent(variant.sku)}`}>
                    {variant.level === "OUT_OF_STOCK" ? "Sold out" : `${variant.stockQuantity} left`}
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="mt-6 border border-dashed border-[#25231f]/18 px-5 py-10 text-center text-sm text-[#25231f]/55">No active variants are low on stock.</p>}
          {dashboard.inventory.outOfStockCount + dashboard.inventory.lowStockCount > dashboard.inventory.alerts.length ? <p className="mt-4 text-xs text-[#25231f]/50">Showing the eight most urgent alerts. Open inventory to review all variants.</p> : null}
        </section>
      </div>

      <section className="mt-10 flex flex-col gap-5 border border-[#25231f]/12 bg-[#25231f] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d2b89f]">Operational review</p><h2 className="mt-2 text-2xl font-semibold">{dashboard.attentionOrderCount ? `${dashboard.attentionOrderCount} order${dashboard.attentionOrderCount === 1 ? "" : "s"} need attention` : "No persisted order exceptions in this period"}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Review exception records before fulfillment. Analytics remains read-only and cannot change payment, order, or stock state.</p></div>
        <Link className="shrink-0 border border-white/30 px-5 py-3 text-center text-sm font-semibold transition hover:bg-white hover:text-[#25231f]" href="/admin/orders">Review orders</Link>
      </section>

      <p className="mt-6 text-xs leading-5 text-[#25231f]/50">
        Gross sales use the provider-observed amount for USD payment records currently marked paid, partially refunded, or refunded, grouped by their stable payment-record creation date. Refund totals use refund-record dates and may relate to sales from an earlier period. Pending, failed, non-USD, and incomplete provider records are excluded. All calculations use recorded integer-cent values.
      </p>
      <p className="sr-only">Signed in as {user.role}.</p>
    </main>
  );
}
