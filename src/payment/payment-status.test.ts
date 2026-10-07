import { describe, expect, it } from "vitest";

import { deriveCustomerPaymentState, shouldClearCart } from "./payment-status";

describe("customer payment state", () => {
  it("does not treat a return URL as payment proof", () => {
    expect(deriveCustomerPaymentState({ paymentStatus: "PENDING", orderStatus: "PENDING", paymentIssueCode: null })).toBe("PROCESSING");
    expect(shouldClearCart("PROCESSING")).toBe(false);
    expect(shouldClearCart("UNVERIFIED")).toBe(false);
  });

  it("clears the cart only for a verified, fulfillable payment", () => {
    expect(deriveCustomerPaymentState({ paymentStatus: "PAID", orderStatus: "PROCESSING", paymentIssueCode: null })).toBe("CONFIRMED");
    expect(shouldClearCart("CONFIRMED")).toBe(true);
    expect(deriveCustomerPaymentState({ paymentStatus: "PAID", orderStatus: "PENDING", paymentIssueCode: "PAID_REQUIRES_INVENTORY_REVIEW" })).toBe("REVIEW");
    expect(shouldClearCart("REVIEW")).toBe(false);
  });
});

