import { z } from "zod";

export const analyticsPeriodSchema = z.enum(["7d", "30d", "90d", "all"]).catch("30d");

export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;

export const analyticsPeriodOptions: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

export const capturedPaymentStatuses = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

const periodDays: Record<Exclude<AnalyticsPeriod, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const dayInMilliseconds = 24 * 60 * 60 * 1000;

export type AnalyticsWindow = {
  period: AnalyticsPeriod;
  start: Date | null;
  end: Date;
};

export type TrendPayment = {
  id: string;
  amountCents: number;
  createdAt: Date;
  status: string;
};

export type RevenueTrendPoint = {
  key: string;
  label: string;
  amountCents: number;
  paymentCount: number;
};

export function getAnalyticsWindow(period: AnalyticsPeriod, now = new Date()): AnalyticsWindow {
  if (period === "all") return { period, start: null, end: new Date(now) };

  const end = new Date(now);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (periodDays[period] - 1));
  return { period, start, end };
}

export function calculateFinancialKpis(input: {
  grossSalesCents: number;
  refundCents: number;
  paidOrderCount: number;
}) {
  return {
    ...input,
    netSalesCents: input.grossSalesCents - input.refundCents,
    averagePaidOrderCents: input.paidOrderCount > 0
      ? Math.round(input.grossSalesCents / input.paidOrderCount)
      : 0,
  };
}

export function getInventoryAlertLevel(stockQuantity: number) {
  if (stockQuantity <= 0) return "OUT_OF_STOCK" as const;
  if (stockQuantity <= 10) return "LOW_STOCK" as const;
  return "HEALTHY" as const;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function uniqueCapturedPayments(payments: TrendPayment[]) {
  const seen = new Set<string>();
  return payments.filter((payment) => {
    if (!capturedPaymentStatuses.includes(payment.status as (typeof capturedPaymentStatuses)[number]) || seen.has(payment.id)) return false;
    seen.add(payment.id);
    return true;
  });
}

export function buildRevenueTrend(payments: TrendPayment[], window: AnalyticsWindow): RevenueTrendPoint[] {
  const captured = uniqueCapturedPayments(payments);

  if (window.period === "all") {
    const months = new Map<string, RevenueTrendPoint>();
    for (const payment of captured) {
      const key = monthKey(payment.createdAt);
      const existing = months.get(key) ?? {
        key,
        label: formatMonth(payment.createdAt),
        amountCents: 0,
        paymentCount: 0,
      };
      existing.amountCents += payment.amountCents;
      existing.paymentCount += 1;
      months.set(key, existing);
    }
    return [...months.values()].sort((left, right) => left.key.localeCompare(right.key));
  }

  const start = window.start!;
  const days = periodDays[window.period];
  const bucketSize = window.period === "90d" ? 7 : 1;
  const bucketCount = Math.ceil(days / bucketSize);
  const points: RevenueTrendPoint[] = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = new Date(start.getTime() + index * bucketSize * dayInMilliseconds);
    return {
      key: dayKey(bucketStart),
      label: bucketSize === 1 ? formatDay(bucketStart) : `Week of ${formatDay(bucketStart)}`,
      amountCents: 0,
      paymentCount: 0,
    };
  });

  for (const payment of captured) {
    const index = Math.floor((payment.createdAt.getTime() - start.getTime()) / (bucketSize * dayInMilliseconds));
    if (index < 0 || index >= points.length) continue;
    points[index].amountCents += payment.amountCents;
    points[index].paymentCount += 1;
  }
  return points;
}
