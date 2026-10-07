import "server-only";

import Stripe from "stripe";

import { PaymentError } from "@/payment/payment-domain";

let stripeClient: Stripe | undefined;

export function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key || !key.startsWith("sk_test_")) {
    throw new PaymentError(
      "PAYMENT_NOT_CONFIGURED",
      "Secure payment is temporarily unavailable.",
    );
  }
  stripeClient ??= new Stripe(key);
  return stripeClient;
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !secret.startsWith("whsec_")) {
    throw new PaymentError(
      "PAYMENT_NOT_CONFIGURED",
      "Stripe webhook verification is not configured.",
    );
  }
  return secret;
}

