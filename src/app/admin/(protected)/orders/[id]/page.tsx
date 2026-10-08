import Link from "next/link";
import { notFound } from "next/navigation";

import { formatCartMoney } from "@/cart/cart-domain";
import { OrderTransitionForm } from "@/components/admin/order-transition-form";
import { canManageOrders, getFulfillmentBlockReason, getNextFulfillmentTransition, orderIdSchema, orderStatusLabels, paymentStatusLabels } from "@/server/admin/order-domain";
import { createAdminOrderService } from "@/server/admin/order-service";
import { requireUser } from "@/server/auth/authorization";
import { db } from "@/server/db/client";

export const instant = false;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
}

export default async function AdminOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const parsedId = orderIdSchema.safeParse(id);
  if (!parsedId.success) notFound();
  const order = await createAdminOrderService(db).getOrder(parsedId.data);
  if (!order) notFound();

  const canManage = canManageOrders(user.role);
  const next = getNextFulfillmentTransition(order.status);
  const blockReason = getFulfillmentBlockReason({ orderStatus: order.status, paymentStatus: order.paymentStatus, paymentIssueCode: order.paymentIssueCode });

  return <main>
    <Link className="text-sm text-[#25231f]/60 underline-offset-4 hover:underline" href="/admin/orders">← Orders</Link>
    <header className="mt-8 flex flex-col gap-5 border-b border-[#25231f]/12 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a5a3b]">Order record</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{order.orderNumber}</h1><p className="mt-3 text-sm text-[#25231f]/55">Placed {formatDate(order.createdAt)} UTC</p></div>
      <div className="flex flex-wrap gap-2"><span className="bg-[#25231f]/8 px-3 py-2 text-xs font-semibold">{order.orderStatusLabel}</span><span className={`px-3 py-2 text-xs font-semibold ${order.paymentIssueCode ? "bg-[#9a5f42]/12 text-[#7a432d]" : "bg-[#34463b]/10 text-[#34463b]"}`}>{order.paymentStatusLabel}</span></div>
    </header>

    <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="grid gap-8">
        <section className="border border-[#25231f]/12 bg-white p-6 sm:p-8"><h2 className="text-xl font-medium">Purchased items</h2><p className="mt-2 text-xs text-[#25231f]/50">These are immutable checkout snapshots and do not change with the current catalogue.</p><ul className="mt-5 divide-y divide-[#25231f]/10 border-y border-[#25231f]/10">{order.items.map((item) => <li className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto]" key={item.id}><div><h3 className="font-medium">{item.productName}</h3><p className="mt-1 text-sm text-[#25231f]/55">{item.variantName}</p><p className="mt-2 text-xs text-[#25231f]/45">SKU {item.sku} · Quantity {item.quantity} · {formatCartMoney(item.unitPriceCents)} each</p></div><p className="font-medium sm:text-right">{formatCartMoney(item.lineTotalCents)}</p></li>)}</ul></section>

        <section className="border border-[#25231f]/12 bg-white p-6 sm:p-8"><h2 className="text-xl font-medium">Status history</h2>{order.statusEvents.length ? <ol className="mt-6 border-l border-[#25231f]/18 pl-6">{order.statusEvents.map((event) => <li className="relative pb-7 last:pb-0" key={event.id}><span aria-hidden="true" className="absolute -left-[1.72rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-[#34463b]" /><p className="font-medium">{orderStatusLabels[event.toStatus] ?? "Order updated"}</p><p className="mt-1 text-xs text-[#25231f]/45">{event.fromStatus ? `${orderStatusLabels[event.fromStatus] ?? event.fromStatus} → ` : ""}{orderStatusLabels[event.toStatus] ?? event.toStatus}</p>{event.note ? <p className="mt-2 text-sm leading-6 text-[#25231f]/60">{event.note}</p> : null}<time className="mt-2 block text-xs text-[#25231f]/45" dateTime={event.createdAt}>{formatDate(event.createdAt)} UTC</time></li>)}</ol> : <p className="mt-4 text-sm text-[#25231f]/55">No status events have been recorded yet.</p>}</section>

        <section className="border border-[#25231f]/12 bg-white p-6 sm:p-8"><h2 className="text-xl font-medium">Manual fulfillment</h2><p className="mt-2 text-sm leading-6 text-[#25231f]/60">Maison Vale does not have a carrier or tracking integration. Dispatch and delivery states are administrator confirmations, not carrier-verified events.</p>{canManage && next && !blockReason && (order.status === "PROCESSING" || order.status === "SHIPPED") ? <div className="mt-5"><OrderTransitionForm orderId={order.id} expectedStatus={order.status} targetStatus={next.targetStatus} label={next.label} /></div> : <p className="mt-5 border border-[#25231f]/10 bg-[#f7f4ee] px-4 py-3 text-sm text-[#25231f]/60">{!canManage ? "Staff access is read-only. An administrator must record fulfillment changes." : blockReason ?? "No further manual fulfillment action is available."}</p>}<p className="mt-4 text-xs leading-5 text-[#25231f]/45">Cancellation, refunds, automatic restocking, tracking numbers, and carrier events are not available in this workflow.</p></section>
      </div>

      <aside className="grid gap-5 lg:sticky lg:top-8">
        <section className="border border-[#25231f]/12 bg-white p-6"><h2 className="text-lg font-medium">Customer</h2><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-xs uppercase tracking-wider text-[#25231f]/45">Name</dt><dd className="mt-1">{order.shippingName}</dd></div><div><dt className="text-xs uppercase tracking-wider text-[#25231f]/45">Email</dt><dd className="mt-1 break-all">{order.email}</dd></div></dl></section>
        <section className="border border-[#25231f]/12 bg-white p-6"><h2 className="text-lg font-medium">Shipping address</h2><address className="mt-4 not-italic text-sm leading-6 text-[#25231f]/65">{order.shippingName}<br />{order.shippingLine1}<br />{order.shippingLine2 ? <>{order.shippingLine2}<br /></> : null}{order.shippingCity}{order.shippingRegion ? `, ${order.shippingRegion}` : ""} {order.shippingPostalCode}<br />{order.shippingCountry}</address></section>
        <section className="border border-[#25231f]/12 bg-white p-6"><h2 className="text-lg font-medium">Payment record</h2>{order.payments.length ? <div className="mt-4 grid gap-4">{order.payments.map((payment) => <div className="border-b border-[#25231f]/10 pb-4 last:border-0 last:pb-0" key={payment.id}><p className="text-sm font-medium">{paymentStatusLabels[payment.status] ?? payment.status}</p><p className="mt-1 text-xs text-[#25231f]/50">{formatCartMoney(payment.amountCents)} {payment.currency} · Updated {formatDate(payment.updatedAt)} UTC</p>{payment.refunds.length ? <p className="mt-2 text-xs text-[#25231f]/55">Recorded refunds: {formatCartMoney(payment.refunds.reduce((sum, refund) => sum + refund.amountCents, 0))}</p> : null}</div>)}</div> : <p className="mt-4 text-sm text-[#25231f]/55">No payment record is available.</p>}{order.paymentReviewLabel ? <p className="mt-4 border border-[#9a5f42]/25 bg-[#9a5f42]/8 px-3 py-2 text-xs leading-5 text-[#733f28]">{order.paymentReviewLabel}. Fulfillment is locked.</p> : null}<p className="mt-4 text-xs leading-5 text-[#25231f]/45">Payment status is read-only and can change only through verified payment processing.</p></section>
        <section className="border border-[#25231f]/12 bg-white p-6"><h2 className="text-lg font-medium">Order total</h2><dl className="mt-4 grid gap-3 text-sm"><div className="flex justify-between gap-4"><dt>Subtotal</dt><dd>{formatCartMoney(order.subtotalCents)}</dd></div><div className="flex justify-between gap-4"><dt>Shipping</dt><dd>{order.shippingCents === 0 ? "Free" : formatCartMoney(order.shippingCents)}</dd></div><div className="flex justify-between gap-4"><dt>Tax</dt><dd>{formatCartMoney(order.taxCents)}</dd></div><div className="flex justify-between gap-4 border-t border-[#25231f]/12 pt-3 font-medium"><dt>Total</dt><dd>{formatCartMoney(order.totalCents)} {order.currency}</dd></div></dl></section>
      </aside>
    </section>
  </main>;
}
