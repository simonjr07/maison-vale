import { describe, expect, it } from "vitest";

import {
  InventoryError,
  MAX_INVENTORY_QUANTITY,
  getVariantAvailability,
  isVariantPurchasable,
  parseInventoryAdjustment,
} from "./inventory-domain";

const availableVariant = {
  productActive: true,
  productPublished: true,
  variantActive: true,
  stockQuantity: 3,
};

describe("variant availability", () => {
  it("treats an active, published, in-stock variant as purchasable", () => {
    expect(getVariantAvailability(availableVariant)).toBe("In stock");
    expect(isVariantPurchasable(availableVariant)).toBe(true);
  });

  it.each([
    { input: { ...availableVariant, variantActive: false }, condition: "variant is inactive" },
    { input: { ...availableVariant, productActive: false }, condition: "product is inactive" },
    { input: { ...availableVariant, productPublished: false }, condition: "product is unpublished" },
  ])("marks a variant unavailable when the $condition", ({ input }) => {
    expect(getVariantAvailability(input)).toBe("Unavailable");
    expect(isVariantPurchasable(input)).toBe(false);
  });

  it("marks an active zero-stock variant as out of stock", () => {
    const input = { ...availableVariant, stockQuantity: 0 };
    expect(getVariantAvailability(input)).toBe("Out of stock");
    expect(isVariantPurchasable(input)).toBe(false);
  });
});

describe("inventory command validation", () => {
  const validCommand = {
    operation: "DECREASE",
    variantId: "00000000-0000-4000-8000-000000000001",
    quantity: 1,
    reason: "ORDER",
  };

  it("accepts a bounded whole-number adjustment", () => {
    expect(parseInventoryAdjustment(validCommand)).toEqual(validCommand);
  });

  it.each([0, -1, 1.5, MAX_INVENTORY_QUANTITY + 1])(
    "rejects an invalid decrease quantity of %s",
    (quantity) => {
      expect(() => parseInventoryAdjustment({ ...validCommand, quantity })).toThrow(
        InventoryError,
      );
    },
  );

  it("allows zero only when setting an explicit stock level", () => {
    expect(
      parseInventoryAdjustment({
        ...validCommand,
        operation: "SET",
        quantity: 0,
        reason: "CORRECTION",
      }).quantity,
    ).toBe(0);
  });

  it("requires reference fields to be supplied as a pair", () => {
    expect(() =>
      parseInventoryAdjustment({ ...validCommand, referenceType: "ORDER" }),
    ).toThrow(InventoryError);
  });

  it("rejects unknown reasons and malformed variant identifiers", () => {
    expect(() =>
      parseInventoryAdjustment({ ...validCommand, reason: "UNKNOWN" }),
    ).toThrow(InventoryError);
    expect(() =>
      parseInventoryAdjustment({ ...validCommand, variantId: "not-a-uuid" }),
    ).toThrow(InventoryError);
  });
});
