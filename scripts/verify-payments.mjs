import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { CART_VERSION } from "../src/cart/cart-domain.ts";
import { createCheckoutSessionService } from "../src/server/payment/checkout-session-service.ts";
import { createWebhookProcessor } from "../src/server/payment/webhook-service.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const processWebhook = createWebhookProcessor(prisma);
const key = randomUUID();
const orderIds = [];
const productIds = [];
const eventIds = [];
let categoryId;
let sessionSequence = 0;
let createCalls = 0;

function verify(condition, message) {
  if (!condition) throw new Error(message);
}

async function product(name, stockQuantity, priceCents = 5000) {
  const created = await prisma.product.create({
    data: {
      name,
      slug: `payment-${name.toLowerCase().replaceAll(" ", "-")}-${key}`,
      description: "Temporary payment verification fixture.",
      categoryId,
      active: true,
      published: true,
      variants: { create: { sku: `PAY-${name.toUpperCase().replaceAll(" ", "-")}-${key}`, name: `${name} variant`, priceCents, stockQuantity, active: true } },
    },
    include: { variants: true },
  });
  productIds.push(created.id);
  return created.variants[0];
}

async function pendingOrder(variant, { quantity = 1, totalCents = 5800, sessionId = `cs_test_${randomUUID()}` } = {}) {
  const order = await prisma.order.create({
    data: {
      orderNumber: `MV-VERIFY-${randomUUID().slice(0, 8).toUpperCase()}`,
      email: "payment-verification@example.com",
      status: "PENDING",
      currency: "USD",
      subtotalCents: totalCents - 800,
      shippingCents: 800,
      taxCents: 0,
      totalCents,
      shippingName: "Payment Verification",
      shippingLine1: "10 Test Lane",
      shippingCity: "Brooklyn",
      shippingRegion: "NY",
      shippingPostalCode: "11201",
      shippingCountry: "US",
      items: { create: { productVariantId: variant.id, productName: "Verification Product", variantName: variant.name, sku: variant.sku, unitPriceCents: (totalCents - 800) / quantity, quantity, lineTotalCents: totalCents - 800 } },
      payments: { create: { provider: "STRIPE", providerCheckoutSessionId: sessionId, status: "PENDING", amountCents: totalCents, currency: "USD" } },
    },
    include: { payments: true },
  });
  orderIds.push(order.id);
  return { order, payment: order.payments[0], sessionId };
}

function event(fixture, suffix, overrides = {}) {
  const eventId = `evt_${suffix}_${key}`;
  eventIds.push(eventId);
  return {
    eventId,
    eventType: "checkout.session.completed",
    session: {
      id: fixture.sessionId,
      livemode: false,
      paymentStatus: "paid",
      amountTotal: fixture.order.totalCents,
      currency: "usd",
      clientReferenceId: fixture.order.id,
      orderId: fixture.order.id,
      orderNumber: fixture.order.orderNumber,
      paymentIntentId: `pi_${suffix}_${key}`,
      ...overrides,
    },
  };
}

async function read(fixture, variant) {
  const [order, payment, currentVariant, movements, transitions] = await Promise.all([
    prisma.order.findUniqueOrThrow({ where: { id: fixture.order.id } }),
    prisma.payment.findUniqueOrThrow({ where: { id: fixture.payment.id } }),
    prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } }),
    prisma.inventoryMovement.count({ where: { referenceType: "ORDER", referenceId: fixture.order.id } }),
    prisma.orderStatusEvent.count({ where: { orderId: fixture.order.id } }),
  ]);
  return { order, payment, currentVariant, movements, transitions };
}

try {
  const category = await prisma.category.create({ data: { name: "Payment Verification", slug: `payment-verification-${key}`, active: true } });
  categoryId = category.id;

  const sessionVariant = await product("Session Product", 3);
  const stripe = {
    create: async (params) => {
      createCalls += 1;
      sessionSequence += 1;
      verify(params.line_items[0].price_data.unit_amount === 5000, "Stripe did not receive the authoritative catalogue price.");
      verify(params.line_items.at(-1).price_data.unit_amount === 800, "Stripe did not receive authoritative shipping.");
      return { id: `cs_test_created_${sessionSequence}_${key}`, url: `https://checkout.stripe.test/session-${sessionSequence}`, livemode: false, payment_intent: null };
    },
    retrieve: async (id) => ({ id, url: "https://checkout.stripe.test/existing", livemode: false, payment_intent: null }),
  };
  const createSession = createCheckoutSessionService({ database: prisma, stripe, consumeAttempt: async () => true, attemptSecret: "verification-secret" });
  const attemptToken = randomUUID();
  const request = {
    attemptToken,
    contact: { email: "guest@example.com" },
    shippingAddress: { fullName: "Avery Vale", line1: "12 Garden Lane", line2: "", city: "Portland", region: "OR", postalCode: "97205", country: "US" },
    cart: { version: CART_VERSION, items: [{ variantId: sessionVariant.id, quantity: 1, unitPriceCents: 1 }], totalCents: 1 },
    totalCents: 1,
  };
  const firstSession = await createSession(request, { source: "verification", appOrigin: "http://localhost:3000" });
  const createdOrder = await prisma.order.findUniqueOrThrow({ where: { orderNumber: firstSession.orderNumber }, include: { items: true, payments: true } });
  orderIds.push(createdOrder.id);
  verify(createdOrder.totalCents === 5800 && createdOrder.items[0].unitPriceCents === 5000, "Order snapshots did not use authoritative amounts.");
  verify(createdOrder.status === "PENDING" && createdOrder.payments[0].status === "PENDING", "Session creation did not preserve pending states.");
  await createSession(request, { source: "verification", appOrigin: "http://localhost:3000" });
  verify(createCalls === 1, "A duplicate checkout attempt created another Stripe Session.");
  verify(await prisma.order.count({ where: { checkoutAttemptHash: createdOrder.checkoutAttemptHash } }) === 1, "A duplicate checkout attempt created another order.");

  const failedToken = randomUUID();
  const failingSession = createCheckoutSessionService({
    database: prisma,
    stripe: { create: async () => { throw new Error("Simulated Stripe outage"); }, retrieve: stripe.retrieve },
    consumeAttempt: async () => true,
    attemptSecret: "verification-secret",
  });
  try {
    await failingSession({ ...request, attemptToken: failedToken }, { source: "verification", appOrigin: "http://localhost:3000" });
    throw new Error("A failed Stripe Session creation was accepted.");
  } catch (error) {
    verify(error.code === "CHECKOUT_SESSION_FAILED", "Stripe Session failure did not return the safe payment error.");
  }
  const failedOrder = await prisma.order.findFirstOrThrow({ where: { payments: { some: { failureCode: "CHECKOUT_SESSION_CREATION_FAILED" } } }, orderBy: { createdAt: "desc" }, include: { payments: true } });
  orderIds.push(failedOrder.id);
  verify(failedOrder.status === "PENDING" && failedOrder.payments[0].status === "FAILED", "Stripe Session failure left misleading state.");

  const stockTwo = await product("Scenario A", 2);
  const scenarioA = await pendingOrder(stockTwo);
  const paidEvent = event(scenarioA, "scenario_a");
  verify((await processWebhook(paidEvent)).outcome === "PAYMENT_FINALIZED", "Scenario A was not finalized.");
  let state = await read(scenarioA, stockTwo);
  verify(state.payment.status === "PAID" && state.order.status === "PROCESSING", "Scenario A states are incorrect.");
  verify(state.currentVariant.stockQuantity === 1 && state.movements === 1 && state.transitions === 1, "Scenario A audit or inventory result is incorrect.");
  const webhookRecord = await prisma.stripeWebhookEvent.findUniqueOrThrow({ where: { stripeEventId: paidEvent.eventId } });
  verify(Boolean(webhookRecord.processedAt) && webhookRecord.outcomeCode === "PAYMENT_FINALIZED", "Scenario A event was not marked processed.");

  verify((await processWebhook(paidEvent)).outcome === "DUPLICATE_EVENT", "Scenario B duplicate was not ignored.");
  state = await read(scenarioA, stockTwo);
  verify(state.currentVariant.stockQuantity === 1 && state.movements === 1 && state.transitions === 1, "Scenario B duplicated a business mutation.");

  const concurrentVariant = await product("Scenario C", 2);
  const scenarioC = await pendingOrder(concurrentVariant);
  const concurrentEvent = event(scenarioC, "scenario_c");
  const concurrent = await Promise.all([processWebhook(concurrentEvent), processWebhook(concurrentEvent)]);
  verify(concurrent.some((result) => result.outcome === "PAYMENT_FINALIZED"), "Scenario C did not finalize once.");
  state = await read(scenarioC, concurrentVariant);
  verify(state.currentVariant.stockQuantity === 1 && state.movements === 1 && state.transitions === 1, "Scenario C applied more than one mutation.");

  const emptyVariant = await product("Scenario D", 0);
  const scenarioD = await pendingOrder(emptyVariant);
  verify((await processWebhook(event(scenarioD, "scenario_d"))).outcome === "PAID_REQUIRES_INVENTORY_REVIEW", "Scenario D was not recorded as an operational exception.");
  state = await read(scenarioD, emptyVariant);
  verify(state.payment.status === "PAID" && state.order.status === "PENDING" && state.order.paymentIssueCode === "PAID_REQUIRES_INVENTORY_REVIEW", "Scenario D falsified payment truth or advanced fulfillment.");
  verify(state.currentVariant.stockQuantity === 0 && state.movements === 0, "Scenario D produced negative stock or a movement.");

  const mismatchVariant = await product("Scenario E", 2);
  const scenarioE = await pendingOrder(mismatchVariant);
  verify((await processWebhook(event(scenarioE, "scenario_e", { amountTotal: 1 }))).outcome === "AMOUNT_MISMATCH", "Scenario E amount mismatch was not rejected.");
  state = await read(scenarioE, mismatchVariant);
  verify(state.payment.status === "PAID" && state.order.status === "PENDING" && state.currentVariant.stockQuantity === 2 && state.movements === 0, "Scenario E changed fulfillment or inventory.");

  const currencyVariant = await product("Currency Mismatch", 2);
  const currencyFixture = await pendingOrder(currencyVariant);
  verify((await processWebhook(event(currencyFixture, "currency", { currency: "eur" }))).outcome === "CURRENCY_MISMATCH", "Currency mismatch was not rejected.");
  state = await read(currencyFixture, currencyVariant);
  verify(state.order.status === "PENDING" && state.currentVariant.stockQuantity === 2 && state.movements === 0, "Currency mismatch changed fulfillment or inventory.");

  const rollbackFirst = await product("Rollback First", 1, 2500);
  const rollbackSecond = await product("Rollback Second", 0, 2500);
  const rollback = await pendingOrder(rollbackFirst, { totalCents: 5800 });
  await prisma.orderItem.create({ data: { orderId: rollback.order.id, productVariantId: rollbackSecond.id, productName: "Rollback Second", variantName: rollbackSecond.name, sku: rollbackSecond.sku, unitPriceCents: 2500, quantity: 1, lineTotalCents: 2500 } });
  await processWebhook(event(rollback, "rollback"));
  const rollbackStock = await prisma.productVariant.findUniqueOrThrow({ where: { id: rollbackFirst.id } });
  verify(rollbackStock.stockQuantity === 1 && await prisma.inventoryMovement.count({ where: { referenceId: rollback.order.id } }) === 0, "A partially failed inventory transaction did not roll back.");

  const unknown = event(scenarioE, "unknown");
  unknown.session.id = `cs_test_unknown_${key}`;
  verify((await processWebhook(unknown)).outcome === "UNKNOWN_SESSION", "Unknown session linkage was not handled safely.");

  console.log("Payment integration verification passed: authoritative session creation, attempt idempotency, paid finalization, duplicate and concurrent delivery, inventory exceptions, mismatch protection, and rollback.");
} finally {
  await prisma.inventoryMovement.deleteMany({ where: { referenceType: "ORDER", referenceId: { in: orderIds } } });
  await prisma.stripeWebhookEvent.deleteMany({ where: { stripeEventId: { in: eventIds } } });
  await prisma.refund.deleteMany({ where: { payment: { orderId: { in: orderIds } } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.$disconnect();
}

