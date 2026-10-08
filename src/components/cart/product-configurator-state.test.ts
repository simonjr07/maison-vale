import { describe, expect, it } from "vitest";

import {
  canAddVariant,
  createAddedToBagNotice,
  getInitialVariantId,
  getSelectedVariant,
  isVariantSelectable,
  type ProductVariantOption,
} from "./product-configurator-state";

const variants: ProductVariantOption[] = [
  { id: "sold-out", name: "Small", size: "S", color: "Clay", price: "$228", availability: "Out of stock", stockMessage: "Sold out", images: [] },
  { id: "available", name: "Medium", size: "M", color: "Clay", price: "$228", availability: "In stock", stockMessage: "Only 4 left in stock", images: [] },
  { id: "archived", name: "Large", size: "L", color: "Clay", price: "$228", availability: "Unavailable", stockMessage: "Unavailable", images: [] },
];

describe("product configurator state", () => {
  it("selects the first addable variant initially", () => {
    expect(getInitialVariantId(variants)).toBe("available");
  });

  it("updates the selected stock message when variants switch", () => {
    expect(getSelectedVariant(variants, "available")?.stockMessage).toBe("Only 4 left in stock");
    expect(getSelectedVariant(variants, "sold-out")?.stockMessage).toBe("Sold out");
  });

  it("allows sold-out selection for clear feedback but prevents adding it", () => {
    expect(isVariantSelectable(variants[0])).toBe(true);
    expect(canAddVariant(variants[0])).toBe(false);
    expect(isVariantSelectable(variants[2])).toBe(false);
  });

  it("creates one concise add-to-bag confirmation", () => {
    expect(createAddedToBagNotice("Medium")).toEqual({
      title: "Added to bag",
      detail: "Medium is now in your bag.",
    });
  });
});
