import { describe, expect, it } from "vitest";

import {
  CATALOGUE_IMAGE_OPTIONS,
  canManageCatalogue,
  categoryInputSchema,
  normalizeSlug,
  productInputSchema,
  variantInputSchema,
} from "./catalogue-domain";

describe("admin catalogue validation", () => {
  it("normalizes human-readable names into safe slugs", () => {
    expect(normalizeSlug("  Vale & Hearth Overshirt  ")).toBe("vale-hearth-overshirt");
  });

  it("allows only the curated local image set", () => {
    const base = {
      name: "Vale Coat",
      slug: "vale-coat",
      description: "A considered outer layer for everyday use.",
      categoryId: "00000000-0000-4000-8000-000000000001",
      active: "on",
      published: "",
      imageAlt: "Vale coat in stone",
    };
    expect(productInputSchema.safeParse({ ...base, imageUrl: CATALOGUE_IMAGE_OPTIONS[0] }).success).toBe(true);
    expect(productInputSchema.safeParse({ ...base, imageUrl: "https://example.com/image.jpg" }).success).toBe(false);
  });

  it("rejects a comparison price that is not higher than the selling price", () => {
    expect(variantInputSchema.safeParse({
      sku: "VALE-01", name: "Standard", size: "", color: "", priceCents: "12000",
      compareAtPriceCents: "10000", active: "on",
    }).success).toBe(false);
  });

  it("bounds category fields and catalogue roles", () => {
    expect(categoryInputSchema.safeParse({ name: "Living", slug: "living", description: "", active: "on" }).success).toBe(true);
    expect(canManageCatalogue("ADMIN")).toBe(true);
    expect(canManageCatalogue("STAFF")).toBe(false);
  });
});
