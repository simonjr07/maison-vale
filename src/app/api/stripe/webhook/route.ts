import { PaymentError } from "@/payment/payment-domain";
import { processPaidCheckoutSession } from "@/server/payment/webhook";
import { normalizeCompletedCheckoutSession } from "@/server/stripe/checkout-event";
import { getStripeClient, getStripeWebhookSecret } from "@/server/stripe/stripe-client";

const MAX_WEBHOOK_LENGTH = 1_000_000;

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Webhook signature is required." }, { status: 400 });
  }

  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_WEBHOOK_LENGTH) {
      return Response.json({ error: "Webhook payload is too large." }, { status: 413 });
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );

    if (event.type !== "checkout.session.completed") {
      console.info("Stripe webhook ignored.", { eventId: event.id, eventType: event.type });
      return Response.json({ received: true, outcome: "IGNORED_EVENT_TYPE" });
    }

    const result = await processPaidCheckoutSession(
      normalizeCompletedCheckoutSession(event.id, event.data.object),
    );

    console.info("Stripe webhook processed.", {
      eventId: event.id,
      eventType: event.type,
      orderNumber: result.orderNumber,
      outcome: result.outcome,
    });
    if (result.outcome === "LIVE_MODE_REJECTED") {
      return Response.json({ error: "Live-mode webhooks are not accepted." }, { status: 400 });
    }
    return Response.json({ received: true, outcome: result.outcome });
  } catch (error) {
    if (error instanceof PaymentError) {
      console.warn("Stripe webhook unavailable because verification is not configured.");
      return Response.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof Error && error.name === "StripeSignatureVerificationError") {
      console.warn("Stripe webhook signature rejected.");
      return Response.json({ error: "Webhook signature is invalid." }, { status: 400 });
    }
    console.error("Stripe webhook processing failed.");
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

