import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.ts";
import { createRateLimitWindow } from "../src/server/auth/rate-limit-core.ts";
import {
  OrderLookupDeniedError,
  OrderLookupRateLimitError,
  createOrderLookupService,
} from "../src/server/order/order-lookup-service.ts";
import { createOrderLookupRateLimiter } from "../src/server/order/rate-limit.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const fixture = randomUUID().replaceAll("-", "").toUpperCase();
const secret = `order-lookup-integration-secret-${fixture}`;
const source = `integration-${fixture}`;
const email = "lookup-verification@example.com";
const orderNumbers = [`MV-20261008-${fixture.slice(0, 8)}`, `MV-20261008-${fixture.slice(8, 16)}`];
const orderIds = [];

function verify(condition, message) {
  if (!condition) throw new Error(message);
}

async function createOrder(orderNumber, orderEmail, paymentStatus, orderStatus, issue = null) {
  const order = await prisma.order.create({
    data: {
      orderNumber,
      email: orderEmail,
      status: orderStatus,
      currency: "USD",
      subtotalCents: 5000,
      shippingCents: 800,
      taxCents: 0,
      totalCents: 5800,
      shippingName: "Avery Verification Vale",
      shippingLine1: "10 Private Lane",
      shippingLine2: "Apartment 4",
      shippingCity: "Brooklyn",
      shippingRegion: "NY",
      shippingPostalCode: "11201",
      shippingCountry: "US",
      paymentIssueCode: issue,
      paymentIssueMessage: issue ? "Internal operational detail that must not be public." : null,
      paymentIssueAt: issue ? new Date() : null,
      items: { create: { productName: "Verification Coat", variantName: "Moss / Medium", sku: `PRIVATE-${fixture}`, unitPriceCents: 5000, quantity: 1, lineTotalCents: 5000 } },
      payments: { create: { provider: "STRIPE", providerPaymentId: `pi_lookup_${fixture}_${orderNumber.slice(-4)}`, status: paymentStatus, amountCents: 5800, currency: "USD" } },
      statusEvents: orderStatus === "PROCESSING" ? { create: { fromStatus: "PENDING", toStatus: "PROCESSING", note: "Internal note that must not be public." } } : undefined,
    },
  });
  orderIds.push(order.id);
  return order;
}

try {
  const first = await createOrder(orderNumbers[0], email, "PAID", "PROCESSING");
  const second = await createOrder(orderNumbers[1], "second@example.com", "PAID", "PENDING", "PAID_REQUIRES_INVENTORY_REVIEW");
  const service = createOrderLookupService(prisma, { secret, consumeAttempt: async () => true });

  const verified = await service.verifyOrder({ orderNumber: orderNumbers[0].toLowerCase(), email: email.toUpperCase() }, source);
  const details = await service.getOrderDetails(orderNumbers[0], verified.token);
  verify(details?.orderNumber === orderNumbers[0], "Valid proof did not return the expected order.");
  verify(details.paymentState === "CONFIRMED" && details.fulfillmentState === "PROCESSING", "Payment or fulfillment status mapping is incorrect.");
  verify(details.destination.recipient === "Avery V." && details.destination.postalCode === "112••", "Destination masking is incorrect.");
  const serialized = JSON.stringify(details);
  for (const sensitive of [email, "10 Private Lane", "Apartment 4", `PRIVATE-${fixture}`, "pi_lookup_", first.id, "Internal note", "Internal operational detail"]) {
    verify(!serialized.includes(sensitive), `Public order details exposed sensitive value: ${sensitive}`);
  }

  let wrongProofError;
  let missingOrderError;
  try { await service.verifyOrder({ orderNumber: orderNumbers[0], email: "wrong@example.com" }, source); } catch (error) { wrongProofError = error; }
  try { await service.verifyOrder({ orderNumber: "MV-20261008-FFFFFFFF", email }, source); } catch (error) { missingOrderError = error; }
  verify(wrongProofError instanceof OrderLookupDeniedError && missingOrderError instanceof OrderLookupDeniedError, "Invalid proof did not use the generic denial.");
  verify(wrongProofError.message === missingOrderError.message, "Missing and mismatched orders returned distinguishable errors.");

  verify(await service.getOrderDetails(orderNumbers[1], verified.token) === null, "A lookup session crossed into another order.");
  verify(await service.getOrderDetails(orderNumbers[0], verified.token, new Date(Date.now() + 16 * 60 * 1000)) === null, "An expired lookup session remained valid.");

  const secondVerified = await service.verifyOrder({ orderNumber: orderNumbers[1], email: "second@example.com" }, source);
  const secondDetails = await service.getOrderDetails(orderNumbers[1], secondVerified.token);
  verify(secondDetails?.fulfillmentState === "REVIEW_REQUIRED", "Operational review state was not mapped safely.");
  verify(!JSON.stringify(secondDetails).includes(second.paymentIssueMessage ?? "never"), "Internal payment issue text was exposed.");

  const limiter = createOrderLookupRateLimiter(prisma, secret);
  const attempts = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    attempts.push(await limiter({ orderNumber: orderNumbers[0], email, source }));
  }
  verify(attempts.slice(0, 5).every(Boolean) && attempts[5] === false, "The PostgreSQL lookup limiter did not enforce its window.");
  const limitedService = createOrderLookupService(prisma, { secret, consumeAttempt: async () => false });
  try {
    await limitedService.verifyOrder({ orderNumber: orderNumbers[0], email }, source);
    throw new Error("Rate-limited lookup unexpectedly succeeded.");
  } catch (error) {
    verify(error instanceof OrderLookupRateLimitError, "Rate limiting did not return the expected safe error.");
  }

  console.log("Order lookup integration verification passed: valid proof, generic denial, cross-order isolation, expiry, status mapping, masking, and PostgreSQL rate limiting.");
} finally {
  const windows = [
    createRateLimitWindow("order-lookup-source", source, secret),
    createRateLimitWindow(`order-lookup-proof:${orderNumbers[0]}:${email}`, "proof", secret),
  ];
  await prisma.loginRateLimitBucket.deleteMany({ where: { keyHash: { in: windows.map((window) => window.keyHash) } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.$disconnect();
}

