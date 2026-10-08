import "dotenv/config";

import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.ts";
import { createAdminAnalyticsService } from "../src/server/admin/analytics-service.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const service = createAdminAnalyticsService(prisma);
const key = randomUUID().replaceAll("-", "").toUpperCase();
const now = new Date("2126-10-08T12:00:00.000Z");
const ids = { orders: [], payments: [], webhookEvents: [], category: null, product: null, variants: [] };

function verify(condition, message) {
  if (!condition) throw new Error(message);
}

async function createOrder(suffix, {
  createdAt,
  paymentStatus,
  amountCents,
  providerObservedCents = amountCents,
  productName,
  variantName,
  quantity = 1,
  snapshotSku = `SNAPSHOT-${suffix}-${key.slice(0, 8)}`,
  issue = null,
  refundCents = 0,
}) {
  const order = await prisma.order.create({
    data: {
      orderNumber: `MV-21261008-${suffix}${key.slice(0, 8 - suffix.length)}`,
      email: `analytics-${suffix.toLowerCase()}-${key.slice(0, 6).toLowerCase()}@example.com`,
      status: paymentStatus === "PENDING" || paymentStatus === "FAILED" || issue ? "PENDING" : "PROCESSING",
      currency: "USD",
      subtotalCents: amountCents,
      shippingCents: 0,
      taxCents: 0,
      totalCents: amountCents,
      shippingName: `Analytics Customer ${suffix}`,
      shippingLine1: "12 Private Analytics Lane",
      shippingCity: "Brooklyn",
      shippingRegion: "NY",
      shippingPostalCode: "11201",
      shippingCountry: "US",
      paymentIssueCode: issue,
      paymentIssueMessage: issue ? "Fixture-only internal diagnostics." : null,
      paymentIssueAt: issue ? createdAt : null,
      createdAt,
      updatedAt: createdAt,
      items: { create: {
        productName,
        variantName,
        sku: snapshotSku,
        unitPriceCents: Math.floor(amountCents / quantity),
        quantity,
        lineTotalCents: amountCents,
        createdAt,
      } },
      payments: { create: {
        provider: "STRIPE",
        providerPaymentId: `pi_analytics_${suffix}_${key}`,
        providerCheckoutSessionId: `cs_test_analytics_${suffix}_${key}`,
        providerAmountCents: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(paymentStatus) ? providerObservedCents : null,
        providerCurrency: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(paymentStatus) ? "USD" : null,
        status: paymentStatus,
        amountCents,
        currency: "USD",
        createdAt,
        updatedAt: createdAt,
      } },
    },
    include: { payments: true },
  });
  ids.orders.push(order.id);
  ids.payments.push(order.payments[0].id);
  if (refundCents > 0) {
    await prisma.refund.create({
      data: {
        paymentId: order.payments[0].id,
        providerRefundId: `re_analytics_${suffix}_${key}`,
        amountCents: refundCents,
        reason: "Analytics integration fixture",
        createdAt: new Date("2126-10-08T08:00:00.000Z"),
      },
    });
  }
  return order;
}

try {
  const baseline = await service.getDashboard("30d", now);
  const category = await prisma.category.create({ data: { name: `Analytics verification ${key}`, slug: `analytics-verification-${key.toLowerCase()}`, active: true } });
  ids.category = category.id;
  const product = await prisma.product.create({ data: { name: `Analytics inventory ${key}`, slug: `analytics-inventory-${key.toLowerCase()}`, description: "Temporary analytics verification fixture.", categoryId: category.id, active: true, published: true } });
  ids.product = product.id;
  for (const [suffix, stockQuantity] of [["ZERO", 0], ["LOW", 7], ["HEALTHY", 20]]) {
    const variant = await prisma.productVariant.create({ data: { productId: product.id, sku: `ANALYTICS-${suffix}-${key}`, name: `${suffix} fixture`, priceCents: 5000, stockQuantity, active: true } });
    ids.variants.push(variant.id);
  }

  await createOrder("PAID", { createdAt: new Date("2126-10-08T10:00:00.000Z"), paymentStatus: "PAID", amountCents: 10_000, productName: "Snapshot Coat", variantName: "Stone / Medium", quantity: 2, snapshotSku: `SNAPSHOT-COAT-${key.slice(0, 8)}` });
  await createOrder("PARTIAL", { createdAt: new Date("2126-10-07T10:00:00.000Z"), paymentStatus: "PARTIALLY_REFUNDED", amountCents: 20_000, productName: "Snapshot Bag", variantName: "Walnut", refundCents: 5_000 });
  await createOrder("REFUNDED", { createdAt: new Date("2126-10-06T10:00:00.000Z"), paymentStatus: "REFUNDED", amountCents: 12_000, productName: "Snapshot Shoe", variantName: "Black / 39", quantity: 3, refundCents: 12_000 });
  await createOrder("REVIEW", { createdAt: new Date("2126-10-05T10:00:00.000Z"), paymentStatus: "PAID", amountCents: 15_000, providerObservedCents: 14_000, productName: "Snapshot Coat", variantName: "Stone / Medium", issue: "AMOUNT_MISMATCH", snapshotSku: `SNAPSHOT-COAT-${key.slice(0, 8)}` });
  await createOrder("BOUNDARY", { createdAt: new Date("2126-09-09T00:00:00.000Z"), paymentStatus: "PAID", amountCents: 5_000, productName: "Snapshot Scarf", variantName: "Oat" });
  await createOrder("PENDING", { createdAt: new Date("2126-10-08T09:00:00.000Z"), paymentStatus: "PENDING", amountCents: 90_000, productName: "Pending Item", variantName: "Pending" });
  await createOrder("FAILED", { createdAt: new Date("2126-10-08T09:00:00.000Z"), paymentStatus: "FAILED", amountCents: 70_000, productName: "Failed Item", variantName: "Failed" });
  await createOrder("OUTSIDE", { createdAt: new Date("2126-08-01T10:00:00.000Z"), paymentStatus: "PAID", amountCents: 99_000, productName: "Outside Item", variantName: "Outside" });

  for (const suffix of ["ONE", "TWO"]) {
    const event = await prisma.stripeWebhookEvent.create({ data: { stripeEventId: `evt_analytics_${suffix}_${key}`, eventType: "checkout.session.completed", processedAt: now, outcomeCode: suffix === "ONE" ? "PAYMENT_FINALIZED" : "DUPLICATE_EVENT", createdAt: now } });
    ids.webhookEvents.push(event.id);
  }

  const dashboard = await service.getDashboard("30d", now);
  verify(dashboard.financials.grossSalesCents === 61_000, "Gross sales did not use provider-observed captured amounts in the UTC window.");
  verify(dashboard.financials.refundCents === 17_000, "Refund totals did not use persisted refund records.");
  verify(dashboard.financials.netSalesCents === 44_000, "Net sales did not subtract recorded refunds.");
  verify(dashboard.financials.paidOrderCount === 5, "Paid order count included pending/failed orders or duplicated an order.");
  verify(dashboard.financials.averagePaidOrderCents === 12_200, "Average paid order value was incorrect.");
  verify(dashboard.attentionOrderCount === 1, "Persisted payment/inventory exceptions were not isolated.");
  verify(dashboard.inventory.outOfStockCount === baseline.inventory.outOfStockCount + 1, "Current sold-out inventory count was incorrect.");
  verify(dashboard.inventory.lowStockCount === baseline.inventory.lowStockCount + 1, "Current low-stock inventory count was incorrect.");
  verify(dashboard.topVariants[0]?.productName === "Snapshot Coat" && dashboard.topVariants[0]?.unitsSold === 3, "Top variants did not aggregate immutable snapshots by units.");
  verify(!dashboard.topVariants.some((item) => item.productName === "Pending Item" || item.productName === "Failed Item" || item.productName === "Outside Item"), "Top variants included non-paid or out-of-range orders.");
  verify(dashboard.revenueTrend.reduce((sum, point) => sum + point.amountCents, 0) === 61_000, "Revenue trend did not reconcile to verified gross sales.");

  const sevenDay = await service.getDashboard("7d", now);
  verify(sevenDay.financials.grossSalesCents === 56_000 && sevenDay.financials.paidOrderCount === 4, "Seven-day UTC filtering did not exclude the older boundary fixture.");
  verify(sevenDay.financials.refundCents === 17_000 && sevenDay.financials.netSalesCents === 39_000, "Seven-day refund and net values were incorrect.");

  const serialized = JSON.stringify(dashboard);
  verify(!serialized.includes("@example.com") && !serialized.includes("Private Analytics Lane"), "Analytics exposed customer contact or address data.");
  verify(!serialized.includes("pi_analytics") && !serialized.includes("cs_test_analytics") && !serialized.includes("evt_analytics"), "Analytics exposed provider or webhook identifiers.");

  console.log("Admin analytics integration verification passed: verified-only sales, refund and net calculations, UTC periods, distinct paid orders, immutable snapshot rankings, exception counts, current inventory alerts, webhook-ledger isolation, and PII/provider-id exclusion.");
} finally {
  if (ids.webhookEvents.length) await prisma.stripeWebhookEvent.deleteMany({ where: { id: { in: ids.webhookEvents } } });
  if (ids.payments.length) await prisma.refund.deleteMany({ where: { paymentId: { in: ids.payments } } });
  if (ids.payments.length) await prisma.payment.deleteMany({ where: { id: { in: ids.payments } } });
  if (ids.orders.length) await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
  if (ids.variants.length) await prisma.productVariant.deleteMany({ where: { id: { in: ids.variants } } });
  if (ids.product) await prisma.product.deleteMany({ where: { id: ids.product } });
  if (ids.category) await prisma.category.deleteMany({ where: { id: ids.category } });
  await prisma.$disconnect();
}
