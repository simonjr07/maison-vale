import { describe, expect, it } from "vitest";

import {
  analyticsPeriodSchema,
  buildRevenueTrend,
  calculateFinancialKpis,
  getAnalyticsWindow,
  getInventoryAlertLevel,
} from "./analytics-domain";

describe("analytics period and metric policy", () => {
  it("validates periods and falls back to the 30-day view", () => {
    expect(analyticsPeriodSchema.parse("7d")).toBe("7d");
    expect(analyticsPeriodSchema.parse("unsupported")).toBe("30d");
    expect(analyticsPeriodSchema.parse(["7d", "90d"])).toBe("30d");
  });

  it("uses inclusive UTC calendar-day boundaries", () => {
    const window = getAnalyticsWindow("7d", new Date("2026-10-08T15:42:10.000Z"));
    expect(window.start?.toISOString()).toBe("2026-10-02T00:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-10-08T15:42:10.000Z");
    expect(getAnalyticsWindow("all", window.end).start).toBeNull();
  });

  it("calculates refunds, net sales, and paid-order average without fabricating values", () => {
    expect(calculateFinancialKpis({ grossSalesCents: 50_000, refundCents: 8_000, paidOrderCount: 4 })).toEqual({
      grossSalesCents: 50_000,
      refundCents: 8_000,
      netSalesCents: 42_000,
      paidOrderCount: 4,
      averagePaidOrderCents: 12_500,
    });
    expect(calculateFinancialKpis({ grossSalesCents: 0, refundCents: 0, paidOrderCount: 0 }).averagePaidOrderCents).toBe(0);
  });
});

describe("revenue trends and stock alerts", () => {
  it("excludes pending and failed payments and de-duplicates the same payment record", () => {
    const window = getAnalyticsWindow("7d", new Date("2026-10-08T23:00:00.000Z"));
    const trend = buildRevenueTrend([
      { id: "paid", amountCents: 10_000, createdAt: new Date("2026-10-08T10:00:00.000Z"), status: "PAID" },
      { id: "paid", amountCents: 10_000, createdAt: new Date("2026-10-08T10:00:00.000Z"), status: "PAID" },
      { id: "partial", amountCents: 8_000, createdAt: new Date("2026-10-07T10:00:00.000Z"), status: "PARTIALLY_REFUNDED" },
      { id: "pending", amountCents: 99_000, createdAt: new Date("2026-10-08T11:00:00.000Z"), status: "PENDING" },
      { id: "failed", amountCents: 99_000, createdAt: new Date("2026-10-08T12:00:00.000Z"), status: "FAILED" },
    ], window);
    expect(trend).toHaveLength(7);
    expect(trend.reduce((sum, point) => sum + point.amountCents, 0)).toBe(18_000);
    expect(trend.reduce((sum, point) => sum + point.paymentCount, 0)).toBe(2);
  });

  it("returns an honest empty all-time trend", () => {
    expect(buildRevenueTrend([], getAnalyticsWindow("all", new Date("2026-10-08T00:00:00.000Z")))).toEqual([]);
  });

  it("maps the exact inventory thresholds", () => {
    expect(getInventoryAlertLevel(0)).toBe("OUT_OF_STOCK");
    expect(getInventoryAlertLevel(1)).toBe("LOW_STOCK");
    expect(getInventoryAlertLevel(10)).toBe("LOW_STOCK");
    expect(getInventoryAlertLevel(11)).toBe("HEALTHY");
  });
});
