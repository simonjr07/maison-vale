import "server-only";

import { PaymentError } from "@/payment/payment-domain";
import { db } from "@/server/db/client";
import { createCheckoutSessionService } from "@/server/payment/checkout-session-service";
import { consumeCheckoutAttempt } from "@/server/payment/rate-limit";
import { getStripeClient } from "@/server/stripe/stripe-client";

export function createStripeCheckoutSession(
  input: unknown,
  context: { source: string; appOrigin: string },
) {
  const attemptSecret = process.env.RATE_LIMIT_SECRET;
  if (!attemptSecret) {
    throw new PaymentError(
      "PAYMENT_NOT_CONFIGURED",
      "Secure payment is temporarily unavailable.",
    );
  }

  const stripe = getStripeClient();
  return createCheckoutSessionService({
    database: db,
    stripe: {
      create: (params, options) => stripe.checkout.sessions.create(params, options),
      retrieve: (id) => stripe.checkout.sessions.retrieve(id),
    },
    consumeAttempt: consumeCheckoutAttempt,
    attemptSecret,
  })(input, context);
}

