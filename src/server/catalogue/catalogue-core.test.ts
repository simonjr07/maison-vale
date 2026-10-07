import { describe, expect, it } from "vitest";

import {
  type CatalogueProductRecord,
  FALLBACK_IMAGE,
  filterProductsByCategory,
  filterPublishedProducts,
  findActiveCategoryBySlug,
  findPublishedProductBySlug,
  getPriceDisplay,
  selectPrimaryImage,
  toProductDetailDto,
} from "./catalogue-core";
import { getVariantAvailability } from "../inventory/inventory-domain";

const publicProduct: CatalogueProductRecord = {
  name: "Hearth Overshirt",
  slug: "hearth-overshirt",
  description: "A softly structured overshirt.",
  active: true,
  published: true,
  category: { name: "Soft Tailoring", slug: "soft-tailoring", active: true },
  variants: [
    { name: "Small", size: "S", color: "Clay", priceCents: 22800, stockQuantity: 4, active: true },
    { name: "Medium", size: "M", color: "Clay", priceCents: 24800, stockQuantity: 0, active: true },
    { name: "Archive", size: "L", color: "Clay", priceCents: 19800, stockQuantity: 2, active: false },
  ],
  images: [
    { url: "/second.svg", altText: "Second view", sortOrder: 2 },
    { url: "/primary.svg", altText: "Primary view", sortOrder: 0 },
  ],
};

describe("catalogue visibility", () => {
  it("returns only active, published products in active categories", () => {
    const unpublished = { ...publicProduct, slug: "unpublished", published: false };
    const inactive = { ...publicProduct, slug: "inactive", active: false };
    const inactiveCategory = {
      ...publicProduct,
      slug: "inactive-category",
      category: { ...publicProduct.category, active: false },
    };

    expect(
      filterPublishedProducts([publicProduct, unpublished, inactive, inactiveCategory]).map(
        (product) => product.slug,
      ),
    ).toEqual(["hearth-overshirt"]);
  });

  it("filters public products by category", () => {
    const knit = {
      ...publicProduct,
      slug: "ridge-crew",
      category: { name: "Knitwear", slug: "knitwear", active: true },
    };

    expect(
      filterProductsByCategory([publicProduct, knit], "knitwear").map(
        (product) => product.slug,
      ),
    ).toEqual(["ridge-crew"]);
  });

  it("returns null for invalid, inactive, and unpublished slugs", () => {
    const hidden = { ...publicProduct, slug: "hidden", published: false };
    expect(findPublishedProductBySlug([publicProduct, hidden], "missing")).toBeNull();
    expect(findPublishedProductBySlug([publicProduct, hidden], "hidden")).toBeNull();
  });

  it("returns only active categories by slug", () => {
    const categories = [
      { name: "Knitwear", slug: "knitwear", description: null, active: true },
      { name: "Archive", slug: "archive", description: null, active: false },
    ];

    expect(findActiveCategoryBySlug(categories, "knitwear")?.name).toBe("Knitwear");
    expect(findActiveCategoryBySlug(categories, "archive")).toBeNull();
    expect(findActiveCategoryBySlug(categories, "missing")).toBeNull();
  });
});

describe("catalogue presentation", () => {
  it("maps variant availability accurately", () => {
    const availability = (variant: (typeof publicProduct.variants)[number]) =>
      getVariantAvailability({
        productActive: publicProduct.active,
        productPublished: publicProduct.published,
        variantActive: variant.active,
        stockQuantity: variant.stockQuantity,
      });

    expect(availability(publicProduct.variants[0])).toBe("In stock");
    expect(availability(publicProduct.variants[1])).toBe("Out of stock");
    expect(availability(publicProduct.variants[2])).toBe("Unavailable");
  });

  it("shows an exact price or the lowest active variant price", () => {
    expect(getPriceDisplay([publicProduct.variants[0]])).toBe("$228");
    expect(getPriceDisplay(publicProduct.variants)).toBe("From $228");
    expect(getPriceDisplay([publicProduct.variants[2]])).toBe("Price unavailable");
  });

  it("selects the lowest sort order and supplies an image fallback", () => {
    expect(selectPrimaryImage(publicProduct.images)).toEqual({
      url: "/primary.svg",
      alt: "Primary view",
    });
    expect(selectPrimaryImage([])).toEqual(FALLBACK_IMAGE);
  });

  it("maps product detail data without internal catalogue fields", () => {
    const dto = toProductDetailDto(publicProduct);

    expect(dto.slug).toBe("hearth-overshirt");
    expect(dto.variants.map((variant) => variant.availability)).toEqual([
      "In stock",
      "Out of stock",
      "Unavailable",
    ]);
    expect(dto).not.toHaveProperty("active");
    expect(dto).not.toHaveProperty("published");
    expect(dto.variants[0]).not.toHaveProperty("stockQuantity");
    expect(dto.variants[0]).not.toHaveProperty("sku");
  });
});
