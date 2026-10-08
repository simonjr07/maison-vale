import { describe, expect, it } from "vitest";

import {
  createLookupSession,
  emailMatchesProof,
  mapFulfillmentState,
  mapPaymentState,
  maskPostalCode,
  maskShippingName,
  orderScopeMatches,
  orderLookupSchema,
  toPublicOrderDetails,
  verifyLookupSession,
} from "./order-lookup-domain";

const secret = "order-lookup-test-secret-with-at-least-32-characters";
const now = new Date("2026-10-08T10:00:00Z");

describe("order lookup security domain", () => {
  it("normalizes valid proof input and rejects malformed references", () => {
    expect(orderLookupSchema.parse({
      orderNumber: "  mv-20261008-ab12cd34 ",
      email: " Guest@Example.com ",
      totalCents: 1,
    })).toEqual({ orderNumber: "MV-20261008-AB12CD34", email: "guest@example.com" });
    expect(orderLookupSchema.safeParse({ orderNumber: "123", email: "guest@example.com" }).success).toBe(false);
  });

  it("compares email proof and scoped values without plain-string equality", () => {
    expect(emailMatchesProof("guest@example.com", "guest@example.com", secret)).toBe(true);
    expect(emailMatchesProof("other@example.com", "guest@example.com", secret)).toBe(false);
    expect(emailMatchesProof("guest@example.com", null, secret)).toBe(false);
  });

  it("signs one short-lived order scope and rejects tampering or expiry", () => {
    const orderId = "32bc1c0d-b351-4aa6-b919-827d726dc35e";
    const session = createLookupSession(orderId, secret, now);
    const verified = verifyLookupSession(session.token, secret, now);
    expect(verified?.orderScope).toMatch(/^[a-f0-9]{64}$/);
    expect(orderScopeMatches(orderId, verified!.orderScope, secret)).toBe(true);
    expect(orderScopeMatches("9a8e001b-e844-4e19-92fc-5028a3ef65a9", verified!.orderScope, secret)).toBe(false);
    expect(Buffer.from(session.token.split(".")[0], "base64url").toString("utf8")).not.toContain(orderId);
    expect(verifyLookupSession(`${session.token}x`, secret, now)).toBeNull();
    expect(verifyLookupSession(session.token, `${secret}-other`, now)).toBeNull();
    expect(verifyLookupSession(session.token, secret, new Date("2026-10-08T10:15:01Z"))).toBeNull();
  });

  it("maps payment and fulfillment truth without using redirect data", () => {
    expect(mapPaymentState("PAID")).toBe("CONFIRMED");
    expect(mapPaymentState("FAILED")).toBe("FAILED");
    expect(mapPaymentState(null)).toBe("PENDING");
    expect(mapFulfillmentState({ orderStatus: "PENDING", paymentStatus: "PENDING", paymentIssueCode: null })).toBe("AWAITING_PAYMENT");
    expect(mapFulfillmentState({ orderStatus: "PENDING", paymentStatus: "PAID", paymentIssueCode: "PAID_REQUIRES_INVENTORY_REVIEW" })).toBe("REVIEW_REQUIRED");
    expect(mapFulfillmentState({ orderStatus: "CANCELLED", paymentStatus: "REFUNDED", paymentIssueCode: null })).toBe("CANCELLED");
  });

  it("masks destination fields and returns an allow-listed public DTO", () => {
    expect(maskShippingName("Avery Morgan Vale")).toBe("Avery V.");
    expect(maskPostalCode("11201")).toBe("112••");
    const details = toPublicOrderDetails({
      orderNumber: "MV-20261008-AB12CD34",
      status: "PROCESSING",
      currency: "USD",
      subtotalCents: 5000,
      shippingCents: 800,
      taxCents: 0,
      totalCents: 5800,
      shippingName: "Avery Vale",
      shippingCity: "Brooklyn",
      shippingRegion: "NY",
      shippingPostalCode: "11201",
      shippingCountry: "US",
      paymentIssueCode: null,
      createdAt: now,
      items: [{ productName: "Vale Coat", variantName: "Moss / M", unitPriceCents: 5000, quantity: 1, lineTotalCents: 5000 }],
      payments: [{ status: "PAID", createdAt: now }],
      statusEvents: [{ toStatus: "PROCESSING", createdAt: now }],
    });
    const serialized = JSON.stringify(details);
    expect(details.destination).toEqual({ recipient: "Avery V.", locality: "Brooklyn, NY", postalCode: "112••", country: "United States" });
    expect(serialized).not.toContain("11201");
    expect(serialized).not.toContain("@example.com");
    expect(serialized).not.toContain("provider");
    expect(serialized).not.toContain("sku");
  });
});

