import { describe, expect, it } from "vitest";

import { Prisma } from "../generated/prisma/client";
import {
  catalogueCategories,
  developmentFixtureProducts,
  getProductImages,
  publicCatalogueProducts,
} from "./catalogue-seed-data";
import {
  PUBLIC_CATALOGUE_COUNTS,
  PUBLIC_CATALOGUE_TRANSACTION_OPTIONS,
  PublicCatalogueBootstrapError,
  classifyPublicCatalogueBootstrapFailure,
  formatPublicCatalogueFailureDiagnostic,
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

  it("uses remote-safe transaction budgets without weakening atomicity", () => {
    expect(PUBLIC_CATALOGUE_TRANSACTION_OPTIONS).toEqual({ maxWait: 30_000, timeout: 120_000 });
  });

  it("reports only redacted Prisma, PostgreSQL, and transport diagnostics", () => {
    const transactionError = new Prisma.PrismaClientKnownRequestError(
      "Failed for postgresql://user:super-secret@example.invalid/neondb",
      { code: "P2028", clientVersion: "7.10.0" },
    );
    const transactionDiagnostic = classifyPublicCatalogueBootstrapFailure(transactionError, "transaction-acquisition");
    expect(transactionDiagnostic).toEqual({
      stage: "transaction-acquisition",
      category: "transaction",
      prismaCode: "P2028",
    });
    expect(formatPublicCatalogueFailureDiagnostic(transactionDiagnostic)).toBe(
      "stage=transaction-acquisition; category=transaction; prisma=P2028",
    );
    expect(formatPublicCatalogueFailureDiagnostic(transactionDiagnostic)).not.toContain("super-secret");

    expect(classifyPublicCatalogueBootstrapFailure(
      { message: "contains private data", cause: { code: "23514" } },
      "variant-creation",
    )).toEqual({ stage: "variant-creation", category: "constraint", postgresCode: "23514" });
    expect(classifyPublicCatalogueBootstrapFailure(
      { message: "private provider detail; SQLSTATE 42501; postgresql://secret.invalid/neondb" },
      "category-creation",
    )).toEqual({ stage: "category-creation", category: "permission", postgresCode: "42501" });
    expect(classifyPublicCatalogueBootstrapFailure(
      { message: "contains a private host", code: "ETIMEDOUT" },
      "transaction-acquisition",
    )).toEqual({ stage: "transaction-acquisition", category: "connection", transportCode: "ETIMEDOUT" });
  });
});
