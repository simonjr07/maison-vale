import type { Prisma, PrismaClient } from "../../generated/prisma/client.ts";

import {
  type AnalyticsPeriod,
  buildRevenueTrend,
  calculateFinancialKpis,
  capturedPaymentStatuses,
  getAnalyticsWindow,
  getInventoryAlertLevel,
} from "./analytics-domain.ts";

const trendPaymentLimit = 5_000;

export function createAdminAnalyticsService(database: PrismaClient) {
  async function getDashboard(period: AnalyticsPeriod, now = new Date()) {
    const window = getAnalyticsWindow(period, now);
    const paymentCreatedAt = {
      ...(window.start ? { gte: window.start } : {}),
      lte: window.end,
    };
    const orderCreatedAt = {
      ...(window.start ? { gte: window.start } : {}),
      lte: window.end,
    };
    const capturedPaymentWhere: Prisma.PaymentWhereInput = {
      status: { in: [...capturedPaymentStatuses] },
      providerAmountCents: { not: null },
      providerCurrency: "USD",
      createdAt: paymentCreatedAt,
    };

    const [
      paymentAggregate,
      refundAggregate,
      paidOrderCount,
      attentionOrderCount,
      outOfStockCount,
      lowStockCount,
      inventoryAlerts,
      topVariants,
      trendPayments,
    ] = await Promise.all([
      database.payment.aggregate({
        where: capturedPaymentWhere,
        _sum: { providerAmountCents: true },
        _count: true,
      }),
      database.refund.aggregate({
        where: {
          createdAt: paymentCreatedAt,
          payment: {
            status: { in: [...capturedPaymentStatuses] },
            providerAmountCents: { not: null },
            providerCurrency: "USD",
          },
        },
        _sum: { amountCents: true },
      }),
      database.order.count({
        where: { payments: { some: capturedPaymentWhere } },
      }),
      database.order.count({
        where: { createdAt: orderCreatedAt, paymentIssueCode: { not: null } },
      }),
      database.productVariant.count({
        where: { active: true, stockQuantity: 0, product: { active: true } },
      }),
      database.productVariant.count({
        where: { active: true, stockQuantity: { gte: 1, lte: 10 }, product: { active: true } },
      }),
      database.productVariant.findMany({
        where: { active: true, stockQuantity: { lte: 10 }, product: { active: true } },
        orderBy: [{ stockQuantity: "asc" }, { product: { name: "asc" } }, { name: "asc" }],
        take: 8,
        select: {
          id: true,
          sku: true,
          name: true,
          stockQuantity: true,
          product: { select: { id: true, name: true, published: true } },
        },
      }),
      database.orderItem.groupBy({
        by: ["productName", "variantName", "sku"],
        where: { order: { payments: { some: capturedPaymentWhere } } },
        _sum: { quantity: true, lineTotalCents: true },
        orderBy: [{ _sum: { quantity: "desc" } }, { _sum: { lineTotalCents: "desc" } }],
        take: 5,
      }),
      database.payment.findMany({
        where: capturedPaymentWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: trendPaymentLimit,
        select: { id: true, providerAmountCents: true, createdAt: true, status: true },
      }),
    ]);

    const financials = calculateFinancialKpis({
      grossSalesCents: paymentAggregate._sum?.providerAmountCents ?? 0,
      refundCents: refundAggregate._sum?.amountCents ?? 0,
      paidOrderCount,
    });

    return {
      period,
      generatedAt: window.end.toISOString(),
      windowStart: window.start?.toISOString() ?? null,
      financials: {
        ...financials,
        verifiedPaymentCount: paymentAggregate._count,
      },
      attentionOrderCount,
      inventory: {
        outOfStockCount,
        lowStockCount,
        alerts: inventoryAlerts.map((variant) => ({
          variantId: variant.id,
          productId: variant.product.id,
          productName: variant.product.name,
          variantName: variant.name,
          sku: variant.sku,
          stockQuantity: variant.stockQuantity,
          productPublished: variant.product.published,
          level: getInventoryAlertLevel(variant.stockQuantity),
        })),
      },
      topVariants: topVariants.map((variant) => ({
        productName: variant.productName,
        variantName: variant.variantName,
        sku: variant.sku,
        unitsSold: variant._sum?.quantity ?? 0,
        merchandiseSalesCents: variant._sum?.lineTotalCents ?? 0,
      })),
      revenueTrend: buildRevenueTrend([...trendPayments].reverse().map((payment) => ({
        id: payment.id,
        amountCents: payment.providerAmountCents ?? 0,
        createdAt: payment.createdAt,
        status: payment.status,
      })), window),
      trendLimited: paymentAggregate._count > trendPaymentLimit,
    };
  }

  return { getDashboard };
}
