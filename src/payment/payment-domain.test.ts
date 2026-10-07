import { describe, expect, it } from "vitest";

import {
  checkoutSessionRequestSchema,
  createCheckoutFingerprint,
  createStripeLineItems,
  generateOrderNumber,
  hashCheckoutAttempt,
} from "./payment-domain";

const request = {
  attemptToken: "6f75915a-70bd-4f6f-ad36-54633c1972ae",
  contact: { email: "SHOPPER@EXAMPLE.COM" },
  shippingAddress: {
    fullName: "Avery Vale",
    line1: "10 Main Street",
    line2: "",
    city: "Brooklyn",
    region: "NY",
    postalCode: "11201",
    country: "US",
  },
  cart: { version: 1, items: [{ variantId: "4faed09c-9c27-4414-9cb5-ca256202010d", quantity: 1 }] },
  totalCents: 1,
};

const summary = {
  currency: "USD" as const,
  items: [],
  cart: request.cart as { version: 1; items: Array<{ variantId: string; quantity: number }> },
  subtotalCents: 12_000,
  shippingCents: 800,
  taxCents: 0,
  totalCents: 12_800,
  shippingMethod: "Standard shipping" as const,
};

describe("payment domain", () => {
  it("validates and normalizes a checkout-session request while stripping client totals", () => {
    const parsed = checkoutSessionRequestSchema.parse(request);
    expect(parsed.contact.email).toBe("shopper@example.com");
    expect(parsed.shippingAddress.line2).toBeNull();
    expect(parsed).not.toHaveProperty("totalCents");
  });

  it("rejects an invalid checkout attempt token", () => {
    expect(() => checkoutSessionRequestSchema.parse({ ...request, attemptToken: "retry" })).toThrow();
  });

  it("creates readable, non-sequential public order numbers", () => {
    const first = generateOrderNumber(new Date("2026-10-07T00:00:00Z"));
    const second = generateOrderNumber(new Date("2026-10-07T00:00:00Z"));
    expect(first).toMatch(/^MV-20261007-[A-F0-9]{8}$/);
    expect(second).not.toBe(first);
  });

  it("uses keyed hashes for attempt identity and stable server fingerprints", () => {
    const parsed = checkoutSessionRequestSchema.parse(request);
    expect(hashCheckoutAttempt(parsed.attemptToken, "secret-a")).not.toBe(
      hashCheckoutAttempt(parsed.attemptToken, "secret-b"),
    );
    expect(createCheckoutFingerprint(parsed, summary)).toBe(
      createCheckoutFingerprint(parsed, summary),
    );
  });

  it("builds Stripe line items only from server snapshots", () => {
    expect(createStripeLineItems({
      currency: "USD",
      shippingCents: 800,
      items: [{ productName: "Vale Coat", variantName: "Moss / M", unitPriceCents: 12_000, quantity: 2 }],
    })).toEqual([
      {
        quantity: 2,
        price_data: {
          currency: "usd",
          unit_amount: 12_000,
          product_data: { name: "Vale Coat", description: "Moss / M" },
        },
      },
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 800,
          product_data: { name: "Standard shipping", description: "U.S. standard shipping" },
        },
      },
    ]);
  });
});

