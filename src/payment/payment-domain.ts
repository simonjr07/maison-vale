import { createHash, createHmac, randomBytes } from "node:crypto";

import { z } from "zod";

import { checkoutDetailsSchema, type CheckoutSummaryDto } from "../checkout/checkout-domain.ts";

export const checkoutSessionRequestSchema = checkoutDetailsSchema.extend({
  attemptToken: z.string().uuid("Start a new checkout attempt and try again."),
}).strip();

export type CheckoutSessionRequest = z.infer<typeof checkoutSessionRequestSchema>;

export type CheckoutSessionResult = {
  orderNumber: string;
  url: string;
};

export type PaymentErrorCode =
  | "PAYMENT_NOT_CONFIGURED"
  | "CHECKOUT_RATE_LIMITED"
  | "CHECKOUT_ATTEMPT_CONFLICT"
  | "CHECKOUT_SESSION_FAILED";

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;

  constructor(code: PaymentErrorCode, message: string) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
  }
}

export function generateOrderNumber(now = new Date()) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `MV-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function hashCheckoutAttempt(token: string, secret: string) {
  if (!secret) throw new Error("RATE_LIMIT_SECRET is not configured.");
  return createHmac("sha256", secret).update(`checkout-attempt\0${token}`).digest("hex");
}

export function createCheckoutFingerprint(
  request: CheckoutSessionRequest,
  checkout: CheckoutSummaryDto,
) {
  const normalized = {
    contact: request.contact,
    shippingAddress: request.shippingAddress,
    cart: [...checkout.cart.items].sort((left, right) =>
      left.variantId.localeCompare(right.variantId),
    ),
    amounts: {
      currency: checkout.currency,
      subtotalCents: checkout.subtotalCents,
      shippingCents: checkout.shippingCents,
      taxCents: checkout.taxCents,
      totalCents: checkout.totalCents,
    },
  };

  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export function createStripeLineItems(input: {
  currency: string;
  shippingCents: number;
  items: Array<{
    productName: string;
    variantName: string;
    unitPriceCents: number;
    quantity: number;
  }>;
}) {
  const lineItems = input.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: input.currency.toLowerCase(),
      unit_amount: item.unitPriceCents,
      product_data: { name: item.productName, description: item.variantName },
    },
  }));
  if (input.shippingCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: input.currency.toLowerCase(),
        unit_amount: input.shippingCents,
        product_data: { name: "Standard shipping", description: "U.S. standard shipping" },
      },
    });
  }
  return lineItems;
}

