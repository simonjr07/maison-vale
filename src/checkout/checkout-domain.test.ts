import { describe, expect, it } from "vitest";

import {
  CHECKOUT_TAX_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
  calculateCheckoutAmounts,
  checkoutDetailsSchema,
  getCheckoutFieldErrors,
} from "./checkout-domain";

const validInput = {
  contact: { email: "  Guest@Example.com " },
  shippingAddress: {
    fullName: "  Avery Vale  ",
    line1: "12 Garden Lane",
    line2: "",
    city: "Portland",
    region: "Oregon",
    postalCode: "97205",
    country: "US",
  },
  cart: { version: 1, items: [] },
  totalCents: 1,
};

describe("checkout validation", () => {
  it("normalizes valid guest details and strips fake totals", () => {
    const parsed = checkoutDetailsSchema.parse(validInput);

    expect(parsed.contact.email).toBe("guest@example.com");
    expect(parsed.shippingAddress.fullName).toBe("Avery Vale");
    expect(parsed.shippingAddress.line2).toBeNull();
    expect(parsed).not.toHaveProperty("totalCents");
  });

  it("rejects invalid email and missing address fields with field errors", () => {
    const parsed = checkoutDetailsSchema.safeParse({
      ...validInput,
      contact: { email: "not-an-email" },
      shippingAddress: { ...validInput.shippingAddress, line1: "" },
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const errors = getCheckoutFieldErrors(parsed.error);
    expect(errors["contact.email"]).toContain("Enter a valid email address.");
    expect(errors["shippingAddress.line1"]).toContain("Address line 1 is required.");
  });

  it("rejects unsupported countries, invalid ZIP codes, and excessive fields", () => {
    const parsed = checkoutDetailsSchema.safeParse({
      ...validInput,
      shippingAddress: {
        ...validInput.shippingAddress,
        fullName: "x".repeat(161),
        postalCode: "SW1A 1AA",
        country: "GB",
      },
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const errors = getCheckoutFieldErrors(parsed.error);
    expect(errors["shippingAddress.fullName"]).toBeDefined();
    expect(errors["shippingAddress.postalCode"]).toBeDefined();
    expect(errors["shippingAddress.country"]).toBeDefined();
  });
});

describe("checkout totals", () => {
  it("charges standard shipping below the free-shipping threshold", () => {
    expect(calculateCheckoutAmounts(10_000)).toEqual({
      subtotalCents: 10_000,
      shippingCents: STANDARD_SHIPPING_CENTS,
      taxCents: CHECKOUT_TAX_CENTS,
      totalCents: 10_800,
    });
  });

  it("provides free shipping at and above the threshold", () => {
    expect(calculateCheckoutAmounts(FREE_SHIPPING_THRESHOLD_CENTS)).toEqual({
      subtotalCents: FREE_SHIPPING_THRESHOLD_CENTS,
      shippingCents: 0,
      taxCents: 0,
      totalCents: FREE_SHIPPING_THRESHOLD_CENTS,
    });
  });
});
