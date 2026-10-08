import { describe, expect, it } from "vitest";

import {
  adminOrderListSchema,
  canManageOrders,
  fulfillmentTransitionSchema,
  getFulfillmentBlockReason,
  getNextFulfillmentTransition,
  getPaymentReviewLabel,
  isPermittedTransition,
} from "./order-domain";

describe("admin order query validation", () => {
  it("normalizes bounded search and filter input", () => {
    expect(adminOrderListSchema.parse({ q: "  MV-20261008-ABCDEF12 ", orderStatus: "PROCESSING", paymentStatus: "PAID", page: "2" })).toEqual({
      q: "MV-20261008-ABCDEF12", orderStatus: "PROCESSING", paymentStatus: "PAID", page: 2,
    });
  });

  it("falls back safely for unsupported filters and pages", () => {
    expect(adminOrderListSchema.parse({ q: "", orderStatus: "UNKNOWN", paymentStatus: "UNKNOWN", page: "bad" })).toEqual({
      q: "", orderStatus: "ALL", paymentStatus: "ALL", page: 1,
    });
  });
});

describe("fulfillment policy", () => {
  it("allows only sequential manual fulfillment transitions", () => {
    expect(isPermittedTransition("PROCESSING", "SHIPPED")).toBe(true);
    expect(isPermittedTransition("SHIPPED", "DELIVERED")).toBe(true);
    expect(isPermittedTransition("PROCESSING", "DELIVERED")).toBe(false);
    expect(fulfillmentTransitionSchema.safeParse({ orderId: "00000000-0000-4000-8000-000000000001", expectedStatus: "PROCESSING", targetStatus: "DELIVERED" }).success).toBe(false);
  });

  it("maps the next manual action without inventing cancellation or refunds", () => {
    expect(getNextFulfillmentTransition("PROCESSING")?.targetStatus).toBe("SHIPPED");
    expect(getNextFulfillmentTransition("SHIPPED")?.targetStatus).toBe("DELIVERED");
    expect(getNextFulfillmentTransition("PENDING")).toBeNull();
    expect(getNextFulfillmentTransition("CANCELLED")).toBeNull();
  });

  it("blocks unpaid and inventory-review orders", () => {
    expect(getFulfillmentBlockReason({ orderStatus: "PROCESSING", paymentStatus: "PENDING", paymentIssueCode: null })).toContain("paid");
    expect(getFulfillmentBlockReason({ orderStatus: "PROCESSING", paymentStatus: "PAID", paymentIssueCode: "PAID_REQUIRES_INVENTORY_REVIEW" })).toContain("review");
    expect(getFulfillmentBlockReason({ orderStatus: "PROCESSING", paymentStatus: "PAID", paymentIssueCode: null })).toBeNull();
  });

  it("keeps order writes administrator-only and maps safe review copy", () => {
    expect(canManageOrders("ADMIN")).toBe(true);
    expect(canManageOrders("STAFF")).toBe(false);
    expect(getPaymentReviewLabel("PAID_REQUIRES_INVENTORY_REVIEW")).toBe("Paid · inventory review required");
    expect(getPaymentReviewLabel("AMOUNT_MISMATCH")).toBe("Payment verification review required");
  });
});
