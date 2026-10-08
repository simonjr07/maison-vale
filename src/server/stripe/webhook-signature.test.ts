import Stripe from "stripe";
import { describe, expect, it } from "vitest";

describe("Stripe webhook signature verification", () => {
  const stripe = new Stripe("sk_test_unit_test_only");
  const secret = "whsec_unit_test_only";
  const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed" });

  it("accepts the exact signed raw payload", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(stripe.webhooks.constructEvent(payload, header, secret).id).toBe("evt_test");
  });

  it("rejects a changed payload and an invalid signature", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(() => stripe.webhooks.constructEvent(`${payload} `, header, secret)).toThrow();
    expect(() => stripe.webhooks.constructEvent(payload, "invalid", secret)).toThrow();
  });
});

