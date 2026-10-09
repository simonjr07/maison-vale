import { describe, expect, it } from "vitest";

import {
  catalogueCategories,
  developmentFixtureProducts,
  getProductImages,
  publicCatalogueProducts,
} from "./catalogue-seed-data";
import {
  PUBLIC_CATALOGUE_COUNTS,
  PublicCatalogueBootstrapError,
  validatePublicCatalogueDefinitions,
} from "./public-catalogue-bootstrap";

describe("public catalogue bootstrap definitions", () => {
  it("contains only the exact public catalogue records", () => {
    expect(validatePublicCatalogueDefinitions()).toEqual(PUBLIC_CATALOGUE_COUNTS);
    expect(catalogueCategories).toHaveLength(4);
    expect(publicCatalogueProducts).toHaveLength(8);
    expect(publicCatalogueProducts.flatMap((product) => product.variants)).toHaveLength(20);
    expect(publicCatalogueProducts.flatMap((product) => getProductImages(product))).toHaveLength(24);
    expect(publicCatalogueProducts.every((product) => product.active !== false && product.published !== false)).toBe(true);
  });

  it("keeps development-only fixtures outside the hosted catalogue", () => {
    expect(developmentFixtureProducts.map((product) => product.slug)).toEqual([
      "archive-sample-shirt",
      "retired-sample-object",
    ]);
    expect(publicCatalogueProducts.some((product) => product.slug.includes("sample"))).toBe(false);
  });

  it("fails closed when a definition count or identifier is changed", () => {
    expect(() => validatePublicCatalogueDefinitions(catalogueCategories, publicCatalogueProducts.slice(1))).toThrow(
      PublicCatalogueBootstrapError,
    );

    const duplicateSkuProducts = publicCatalogueProducts.map((product, index) => index === 1
      ? { ...product, variants: product.variants.map((variant, variantIndex) => variantIndex === 0
        ? { ...variant, sku: publicCatalogueProducts[0].variants[0].sku }
        : variant) }
      : product);
    expect(() => validatePublicCatalogueDefinitions(catalogueCategories, duplicateSkuProducts)).toThrow(/duplicate variant SKU/);
  });
});
