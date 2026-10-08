import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import Stripe from "stripe";

import { PrismaClient } from "../src/generated/prisma/client.ts";
import {
  canApplySandboxReconciliation,
  reconciliationEventId,
} from "../src/payment/reconciliation-domain.ts";
import { createWebhookProcessor } from "../src/server/payment/webhook-service.ts";
import { normalizeCompletedCheckoutSession } from "../src/server/stripe/checkout-event.ts";

const orderNumber = process.argv.find((argument) => argument.startsWith("--order="))?.slice(8);
const apply = process.argv.includes("--apply");
const connectionString = process.env.DATABASE_URL;
const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!orderNumber?.match(/^MV-[A-Z0-9-]{8,36}$/)) {
  throw new Error("Provide a valid public order reference with --order=MV-....");
}
if (!connectionString) throw new Error("DATABASE_URL is not configured.");
if (!stripeKey?.startsWith("sk_test_")) {
  throw new Error("Sandbox reconciliation requires a Stripe test key.");
}
if (process.env.NODE_ENV === "production") {
  throw new Error("Sandbox reconciliation is disabled in production.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const stripe = new Stripe(stripeKey);

function redactProviderId(value) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

try {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { payments: { where: { provider: "STRIPE" } } },
  });
  if (!order) throw new Error("The order reference was not found.");
  if (order.payments.length !== 1 || !order.payments[0].providerCheckoutSessionId) {
    throw new Error("The order does not have one linked Stripe Checkout Session.");
  }

  const payment = order.payments[0];
  const session = await stripe.checkout.sessions.retrieve(payment.providerCheckoutSessionId);
  const events = await stripe.events.list({
    type: "checkout.session.completed",
    created: { gte: Math.max(0, session.created - 3600) },
    limit: 100,
  });
  const completionEvent = events.data.find((event) => event.data.object?.id === session.id);

  const checks = {
    testMode: !session.livemode,
    sessionComplete: session.status === "complete",
    paymentPaid: session.payment_status === "paid",
    sessionMatches: session.id === payment.providerCheckoutSessionId,
    linkageMatches:
      session.client_reference_id === order.id &&
      session.metadata?.orderId === order.id &&
      session.metadata?.orderNumber === order.orderNumber,
    amountMatches: session.amount_total === payment.amountCents,
    currencyMatches: session.currency?.toUpperCase() === payment.currency,
    completionEventFound: Boolean(completionEvent),
  };

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    orderNumber: order.orderNumber,
    orderStatus: order.status,
    paymentStatus: payment.status,
    checkoutSession: redactProviderId(session.id),
    completionEvent: completionEvent ? redactProviderId(completionEvent.id) : null,
    checks,
  }, null, 2));

  if (!canApplySandboxReconciliation(checks)) {
    throw new Error("Reconciliation stopped because one or more safety checks failed.");
  }
  if (!apply) {
    console.log("Dry run passed. Add --apply to process the verified sandbox event.");
    process.exitCode = 0;
  } else {
    const stripeSession = completionEvent.data.object;
    const event = normalizeCompletedCheckoutSession(
      reconciliationEventId(completionEvent.id),
      stripeSession,
    );
    const result = await createWebhookProcessor(prisma)(event);
    console.log(JSON.stringify({
      reconciliationOutcome: result.outcome,
      orderNumber: result.orderNumber,
    }, null, 2));
  }
} finally {
  await prisma.$disconnect();
}

