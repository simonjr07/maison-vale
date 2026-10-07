import { describe, expect, it } from "vitest";

import {
  CART_VERSION,
  MAX_CART_LINES,
  addCartItem,
  findChangedPrices,
  getCartCount,
  normalizeCart,
  parseStoredCart,
  updateCartItemQuantity,
  type ResolvedCartDto,
} from "./cart-domain";

const firstId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";

describe("persisted guest cart", () => {
  it("accepts the versioned minimal cart shape", () => {
    expect(
      normalizeCart({
        version: CART_VERSION,
        items: [{ variantId: firstId, quantity: 2 }],
      }),
    ).toEqual({
      version: CART_VERSION,
      items: [{ variantId: firstId, quantity: 2 }],
    });
  });

  it("recovers from malformed JSON and unsupported versions", () => {
    expect(parseStoredCart("{not-json")).toEqual({ version: CART_VERSION, items: [] });
    expect(parseStoredCart(JSON.stringify({ version: 2, items: [] }))).toEqual({
      version: CART_VERSION,
      items: [],
    });
  });

  it.each([0, -1, 1.5, 21])("rejects an invalid quantity of %s", (quantity) => {
    expect(
      normalizeCart({
        version: CART_VERSION,
        items: [{ variantId: firstId, quantity }],
      }),
    ).toBeNull();
  });

  it("merges duplicate variants without trusting extra fields", () => {
    expect(
      normalizeCart({
        version: CART_VERSION,
        items: [
          { variantId: firstId, quantity: 2, unitPriceCents: 1 },
          { variantId: firstId, quantity: 3, productName: "Fake" },
        ],
        subtotalCents: 1,
      }),
    ).toEqual({
      version: CART_VERSION,
      items: [{ variantId: firstId, quantity: 5 }],
    });
  });

  it("rejects excessive line and total quantities", () => {
    const tooManyLines = Array.from({ length: MAX_CART_LINES + 1 }, (_, index) => ({
      variantId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      quantity: 1,
    }));
    expect(normalizeCart({ version: CART_VERSION, items: tooManyLines })).toBeNull();
    expect(
      normalizeCart({
        version: CART_VERSION,
        items: [
          { variantId: firstId, quantity: 20 },
          { variantId: secondId, quantity: 20 },
          { variantId: "00000000-0000-4000-8000-000000000003", quantity: 20 },
        ],
      }),
    ).toBeNull();
  });
});

describe("cart state helpers", () => {
  const emptyCart = { version: CART_VERSION, items: [] };

  it("adds items and counts total units", () => {
    const first = addCartItem(emptyCart, firstId, 2);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = addCartItem(first.cart, secondId, 3);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(getCartCount(second.cart.items)).toBe(5);
  });

  it("rejects updates outside cart limits", () => {
    const cart = { version: CART_VERSION, items: [{ variantId: firstId, quantity: 2 }] };
    expect(updateCartItemQuantity(cart, firstId, 0).ok).toBe(false);
    expect(addCartItem(cart, firstId, 20).ok).toBe(false);
  });

  it("detects an authoritative price change without persisting prices", () => {
    const makeCart = (price: number): ResolvedCartDto => ({
      currency: "USD",
      cart: { version: CART_VERSION, items: [{ variantId: firstId, quantity: 1 }] },
      subtotalCents: price,
      items: [{
        variantId: firstId,
        productName: "Product",
        productSlug: "product",
        variantName: "Variant",
        size: null,
        color: null,
        image: { url: "/image.svg", alt: "Product" },
        requestedQuantity: 1,
        quantity: 1,
        unitPriceCents: price,
        lineTotalCents: price,
        status: "AVAILABLE",
        message: null,
      }],
    });

    expect(findChangedPrices(makeCart(1000), makeCart(1200))).toEqual(
      new Set([firstId]),
    );
  });
});
