import "dotenv/config";

import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.ts";
import { AdminOrderError, createAdminOrderService } from "../src/server/admin/order-service.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const service = createAdminOrderService(prisma);
const key = randomUUID().replaceAll("-", "").toUpperCase();
const actor = { id: randomUUID(), email: "orders-verification-admin@example.com" };
const ids = { orders: [], payments: [], category: null, product: null, variant: null };

function verify(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectOrderError(action, code) {
  try { await action(); } catch (error) {
    verify(error instanceof AdminOrderError, "Expected an administrative order error.");
    verify(error.code === code, `Expected ${code}, received ${error.code}.`);
    return;
  }
  throw new Error(`Expected ${code}.`);
}

async function createOrder(suffix, { orderStatus = "PROCESSING", paymentStatus = "PAID", issue = null, variantId = null } = {}) {
  const order = await prisma.order.create({
    data: {
      orderNumber: `MV-20261008-${suffix}${key.slice(0, 8 - suffix.length)}`,
      email: `${suffix.toLowerCase()}-${key.slice(0, 6).toLowerCase()}@example.com`,
      status: orderStatus,
      currency: "USD",
      subtotalCents: 12500,
      shippingCents: 800,
      taxCents: 0,
      totalCents: 13300,
      shippingName: `Verification Customer ${suffix}`,
      shippingLine1: "10 Verification Lane",
      shippingCity: "Brooklyn",
      shippingRegion: "NY",
      shippingPostalCode: "11201",
      shippingCountry: "US",
      paymentIssueCode: issue,
      paymentIssueMessage: issue ? "Internal verification fixture." : null,
      paymentIssueAt: issue ? new Date() : null,
      items: { create: { productVariantId: variantId, productName: "Snapshot Coat", variantName: "Stone / Medium", sku: `ORDER-${key}`, unitPriceCents: 12500, quantity: 1, lineTotalCents: 12500 } },
      payments: { create: { provider: "STRIPE", providerPaymentId: `pi_admin_orders_${suffix}_${key}`, status: paymentStatus, amountCents: 13300, currency: "USD" } },
      statusEvents: orderStatus === "PROCESSING" ? { create: { fromStatus: "PENDING", toStatus: "PROCESSING", note: "Stripe payment confirmed and inventory committed." } } : undefined,
    },
    include: { payments: true },
  });
  ids.orders.push(order.id);
  ids.payments.push(...order.payments.map((payment) => payment.id));
  return order;
}

try {
  const category = await prisma.category.create({ data: { name: "Order verification", slug: `order-verification-${key.toLowerCase()}`, active: true } });
  ids.category = category.id;
  const product = await prisma.product.create({ data: { name: "Order verification product", slug: `order-verification-product-${key.toLowerCase()}`, description: "Temporary fixture for order operations verification.", categoryId: category.id, active: true, published: true } });
  ids.product = product.id;
  const variant = await prisma.productVariant.create({ data: { productId: product.id, sku: `ORDER-VERIFY-${key}`, name: "Stone / Medium", priceCents: 12500, stockQuantity: 7, active: true } });
  ids.variant = variant.id;

  const eligible = await createOrder("A", { variantId: variant.id });
  const unpaid = await createOrder("B", { paymentStatus: "PENDING" });
  const review = await createOrder("C", { issue: "PAID_REQUIRES_INVENTORY_REVIEW" });
  const concurrent = await createOrder("D");

  const searchByReference = await service.listOrders({ q: eligible.orderNumber, orderStatus: "ALL", paymentStatus: "ALL", page: 1 });
  verify(searchByReference.total === 1 && searchByReference.orders[0].id === eligible.id, "Order-reference search did not isolate the expected order.");
  const searchByEmail = await service.listOrders({ q: eligible.email, orderStatus: "PROCESSING", paymentStatus: "PAID", page: 1 });
  verify(searchByEmail.total === 1, "Authorized email and status filtering failed.");

  const before = await prisma.order.findUniqueOrThrow({
    where: { id: eligible.id },
    select: { subtotalCents: true, shippingCents: true, taxCents: true, totalCents: true, items: true, payments: true },
  });
  const stockBefore = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id }, select: { stockQuantity: true } });
  const movementsBefore = await prisma.inventoryMovement.count({ where: { productVariantId: variant.id } });

  const shipped = await service.transitionFulfillment({ orderId: eligible.id, expectedStatus: "PROCESSING", targetStatus: "SHIPPED" }, actor);
  verify(shipped.status === "SHIPPED", "Paid processing order did not advance to shipped.");
  await service.transitionFulfillment({ orderId: eligible.id, expectedStatus: "SHIPPED", targetStatus: "DELIVERED" }, actor);
  const completed = await prisma.order.findUniqueOrThrow({ where: { id: eligible.id }, include: { statusEvents: { orderBy: { createdAt: "asc" } }, items: true, payments: true } });
  verify(completed.status === "DELIVERED", "Shipped order did not advance to delivered.");
  verify(completed.statusEvents.filter((event) => event.toStatus === "SHIPPED").length === 1, "Dispatch did not create exactly one status event.");
  verify(completed.statusEvents.filter((event) => event.toStatus === "DELIVERED").length === 1, "Delivery did not create exactly one status event.");
  verify(completed.statusEvents.some((event) => event.note?.includes(actor.email)), "Manual status history did not retain actor information.");
  verify(JSON.stringify(completed.items) === JSON.stringify(before.items), "Fulfillment rewrote purchased item snapshots.");
  verify(JSON.stringify(completed.payments) === JSON.stringify(before.payments), "Fulfillment changed payment truth.");
  verify(completed.subtotalCents === before.subtotalCents && completed.shippingCents === before.shippingCents && completed.taxCents === before.taxCents && completed.totalCents === before.totalCents, "Fulfillment changed order financials.");
  const stockAfter = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id }, select: { stockQuantity: true } });
  const movementsAfter = await prisma.inventoryMovement.count({ where: { productVariantId: variant.id } });
  verify(stockAfter.stockQuantity === stockBefore.stockQuantity && movementsAfter === movementsBefore, "Fulfillment changed inventory or its movement ledger.");

  await expectOrderError(() => service.transitionFulfillment({ orderId: unpaid.id, expectedStatus: "PROCESSING", targetStatus: "SHIPPED" }, actor), "PAYMENT_REQUIRED");
  await expectOrderError(() => service.transitionFulfillment({ orderId: review.id, expectedStatus: "PROCESSING", targetStatus: "SHIPPED" }, actor), "REVIEW_REQUIRED");
  await expectOrderError(() => service.transitionFulfillment({ orderId: concurrent.id, expectedStatus: "PROCESSING", targetStatus: "DELIVERED" }, actor), "INVALID_TRANSITION");

  const concurrentResults = await Promise.allSettled([
    service.transitionFulfillment({ orderId: concurrent.id, expectedStatus: "PROCESSING", targetStatus: "SHIPPED" }, actor),
    service.transitionFulfillment({ orderId: concurrent.id, expectedStatus: "PROCESSING", targetStatus: "SHIPPED" }, actor),
  ]);
  verify(concurrentResults.filter((result) => result.status === "fulfilled").length === 1, "Exactly one concurrent fulfillment submission should succeed.");
  verify(concurrentResults.filter((result) => result.status === "rejected" && result.reason instanceof AdminOrderError && result.reason.code === "CONCURRENT_MODIFICATION").length === 1, "The duplicate concurrent submission did not fail safely.");
  verify(await prisma.orderStatusEvent.count({ where: { orderId: concurrent.id, toStatus: "SHIPPED" } }) === 1, "Concurrent fulfillment created duplicate status events.");

  console.log("Admin order integration verification passed: secure search, sequential fulfillment, payment/review protection, one-event concurrency, actor history, and immutable payment, inventory, financial, and item records.");
} finally {
  if (ids.payments.length) await prisma.payment.deleteMany({ where: { id: { in: ids.payments } } });
  if (ids.orders.length) await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
  if (ids.variant) await prisma.productVariant.deleteMany({ where: { id: ids.variant } });
  if (ids.product) await prisma.product.deleteMany({ where: { id: ids.product } });
  if (ids.category) await prisma.category.deleteMany({ where: { id: ids.category } });
  await prisma.$disconnect();
}
