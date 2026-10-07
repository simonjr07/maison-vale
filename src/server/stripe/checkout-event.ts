import type Stripe from "stripe";

import type { PaidCheckoutSessionEvent } from "../payment/webhook-service.ts";

function paymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id ?? null;
}

export function normalizeCompletedCheckoutSession(
  eventId: string,
  session: Stripe.Checkout.Session,
): PaidCheckoutSessionEvent {
  return {
    eventId,
    eventType: "checkout.session.completed",
    session: {
      id: session.id,
      livemode: session.livemode,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      clientReferenceId: session.client_reference_id,
      orderId: session.metadata?.orderId ?? null,
      orderNumber: session.metadata?.orderNumber ?? null,
      paymentIntentId: paymentIntentId(session),
    },
  };
}
