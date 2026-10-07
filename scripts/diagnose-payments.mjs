import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import Stripe from "stripe";

import { PrismaClient } from "../src/generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function redactProviderId(value) {
  if (!value) return null;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

try {
  const [payments, events] = await Promise.all([
    prisma.payment.findMany({
      where: { provider: "STRIPE" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        status: true,
        amountCents: true,
        currency: true,
        providerCheckoutSessionId: true,
        providerAmountCents: true,
        providerCurrency: true,
        failureCode: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentIssueCode: true,
            _count: { select: { items: true, statusEvents: true } },
          },
        },
      },
    }),
    prisma.stripeWebhookEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        stripeEventId: true,
        eventType: true,
        outcomeCode: true,
        processedAt: true,
        createdAt: true,
      },
    }),
  ]);
  const movementCounts = new Map(await Promise.all(payments.map(async (payment) => [
    payment.order.id,
    await prisma.inventoryMovement.count({
      where: { referenceType: "ORDER", referenceId: payment.order.id },
    }),
  ])));

  const report = {
    payments: payments.map((payment) => ({
      orderNumber: payment.order.orderNumber,
      orderStatus: payment.order.status,
      paymentStatus: payment.status,
      paymentIssueCode: payment.order.paymentIssueCode,
      expectedAmountCents: payment.amountCents,
      expectedCurrency: payment.currency,
      observedAmountCents: payment.providerAmountCents,
      observedCurrency: payment.providerCurrency,
      failureCode: payment.failureCode,
      orderItems: payment.order._count.items,
      inventoryMovements: movementCounts.get(payment.order.id) ?? 0,
      orderStatusEvents: payment.order._count.statusEvents,
      checkoutSession: redactProviderId(payment.providerCheckoutSessionId),
      createdAt: payment.createdAt.toISOString(),
    })),
    webhookEvents: events.map((event) => ({
      stripeEvent: redactProviderId(event.stripeEventId),
      eventType: event.eventType,
      outcomeCode: event.outcomeCode,
      processed: Boolean(event.processedAt),
      createdAt: event.createdAt.toISOString(),
    })),
  };

  if (process.argv.includes("--remote")) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key?.startsWith("sk_test_")) {
      throw new Error("A Stripe test key is required for remote diagnostics.");
    }
    const stripe = new Stripe(key);
    report.remoteSessions = [];

    for (const payment of payments.filter(
      (candidate) => candidate.status !== "PAID" && candidate.providerCheckoutSessionId,
    )) {
      try {
        const session = await stripe.checkout.sessions.retrieve(
          payment.providerCheckoutSessionId,
        );
        const completionEvents = await stripe.events.list({
          type: "checkout.session.completed",
          created: { gte: Math.max(0, session.created - 3600) },
          limit: 100,
        });
        const completionEvent = completionEvents.data.find(
          (event) => event.data.object?.id === session.id,
        );
        report.remoteSessions.push({
          orderNumber: payment.order.orderNumber,
          checkoutSession: redactProviderId(session.id),
          sessionStatus: session.status,
          paymentStatus: session.payment_status,
          livemode: session.livemode,
          linkageMatches:
            session.client_reference_id === payment.order.id &&
            session.metadata?.orderId === payment.order.id &&
            session.metadata?.orderNumber === payment.order.orderNumber,
          amountMatches: session.amount_total === payment.amountCents,
          currencyMatches: session.currency?.toUpperCase() === payment.currency,
          completionEventFound: Boolean(completionEvent),
          completionEvent: redactProviderId(completionEvent?.id),
        });
      } catch (error) {
        report.remoteSessions.push({
          orderNumber: payment.order.orderNumber,
          checkoutSession: redactProviderId(payment.providerCheckoutSessionId),
          diagnosticError:
            error && typeof error === "object" && "constructor" in error
              ? error.constructor.name
              : "StripeDiagnosticError",
          diagnosticType:
            error && typeof error === "object" && "type" in error && typeof error.type === "string"
              ? error.type
              : null,
          diagnosticCode:
            error && typeof error === "object" && "code" in error && typeof error.code === "string"
              ? error.code
              : null,
          diagnosticStatus:
            error && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number"
              ? error.statusCode
              : null,
        });
      }
    }
  }

  console.log(JSON.stringify(report, null, 2));
} finally {
  await prisma.$disconnect();
}

