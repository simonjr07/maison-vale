import { Prisma, type PrismaClient } from "../generated/prisma/client.ts";

import {
  catalogueCategories,
  getProductImages,
  publicCatalogueProducts,
  type CatalogueProductDefinition,
  type CatalogueCategoryDefinition,
} from "./catalogue-seed-data.ts";

export const PUBLIC_CATALOGUE_LOCK_ID = BigInt("4698307722026100");

export const PUBLIC_CATALOGUE_TRANSACTION_OPTIONS = {
  maxWait: 30_000,
  timeout: 120_000,
} as const;

export type PublicCatalogueBootstrapStage =
  | "transaction-acquisition"
  | "concurrency-lock"
  | "preflight"
  | "category-creation"
  | "product-creation"
  | "variant-creation"
  | "image-creation";

export type PublicCatalogueFailureCategory =
  | "authentication"
  | "connection"
  | "permission"
  | "constraint"
  | "transaction"
  | "query"
  | "driver"
  | "resource"
  | "unknown";

export type PublicCatalogueFailureDiagnostic = {
  stage: PublicCatalogueBootstrapStage;
  category: PublicCatalogueFailureCategory;
  prismaCode?: string;
  postgresCode?: string;
  transportCode?: string;
};

export const PUBLIC_CATALOGUE_COUNTS = {
  categories: 4,
  products: 8,
  variants: 20,
  images: 24,
} as const;

type CatalogueCounts = {
  categories: number;
  products: number;
  variants: number;
  images: number;
};

export type PublicCatalogueBootstrapResult = {
  created: CatalogueCounts;
  existing: CatalogueCounts;
};

export class PublicCatalogueBootstrapError extends Error {
  readonly code: "INVALID_DEFINITION" | "CONFLICT" | "CONCURRENT_RUN" | "DATABASE_FAILURE";
  readonly diagnostic?: PublicCatalogueFailureDiagnostic;

  constructor(
    code: PublicCatalogueBootstrapError["code"],
    message: string,
    diagnostic?: PublicCatalogueFailureDiagnostic,
  ) {
    super(message);
    this.name = "PublicCatalogueBootstrapError";
    this.code = code;
    this.diagnostic = diagnostic;
  }
}

const TRANSPORT_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ETIMEDOUT",
]);

function readStringProperty(value: unknown, property: string) {
  if (!value || typeof value !== "object") return undefined;
  const candidate = (value as Record<string, unknown>)[property];
  return typeof candidate === "string" ? candidate : undefined;
}

function findPostgresCode(value: unknown, depth = 0, seen = new Set<object>()): string | undefined {
  if (!value || typeof value !== "object" || depth > 5 || seen.has(value)) return undefined;
  seen.add(value);
  const record = value as Record<string, unknown>;
  for (const property of ["sqlState", "sqlstate", "originalCode", "code"]) {
    const candidate = record[property];
    if (typeof candidate === "string" && /^[0-9A-Z]{5}$/.test(candidate)) return candidate;
  }
  for (const property of ["cause", "meta", "driverAdapterError", "database_error", "databaseError"]) {
    const nested = findPostgresCode(record[property], depth + 1, seen);
    if (nested) return nested;
  }
  return undefined;
}

function findLabeledPostgresCode(message: string | undefined, prismaCode?: string) {
  if (!message) return undefined;
  const matches = message.matchAll(/\b(?:sqlstate|postgres(?:ql)?(?: error)? code|database error code|code)\s*[:=]?\s*["']?([0-9A-Z]{5})\b/gi);
  for (const match of matches) {
    const candidate = match[1].toUpperCase();
    if (candidate !== prismaCode) return candidate;
  }
  return undefined;
}

function categorizeFailure(prismaCode?: string, postgresCode?: string, transportCode?: string): PublicCatalogueFailureCategory {
  if (transportCode) return "connection";
  if (prismaCode === "P1000" || postgresCode?.startsWith("28")) return "authentication";
  if (["P1001", "P1002", "P1003", "P1008", "P1011", "P2024"].includes(prismaCode ?? "") || postgresCode?.startsWith("08")) return "connection";
  if (prismaCode === "P1010" || postgresCode === "42501") return "permission";
  if (["P2000", "P2002", "P2003", "P2004"].includes(prismaCode ?? "") || postgresCode?.startsWith("23")) return "constraint";
  if (["P2028", "P2034"].includes(prismaCode ?? "") || postgresCode?.startsWith("40") || postgresCode?.startsWith("55")) return "transaction";
  if (prismaCode === "P2039") return "driver";
  if (postgresCode?.startsWith("53")) return "resource";
  if (prismaCode === "P2010" || postgresCode?.startsWith("42") || postgresCode === "57014") return "query";
  return "unknown";
}

export function classifyPublicCatalogueBootstrapFailure(
  error: unknown,
  stage: PublicCatalogueBootstrapStage,
): PublicCatalogueFailureDiagnostic {
  const knownCode = error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code
    : error instanceof Prisma.PrismaClientInitializationError
      ? error.errorCode ?? undefined
      : undefined;
  const prismaCode = knownCode && /^P\d{4}$/.test(knownCode) ? knownCode : undefined;
  const rawCode = readStringProperty(error, "code");
  const transportCode = rawCode && TRANSPORT_CODES.has(rawCode) ? rawCode : undefined;
  const foundPostgresCode = findPostgresCode(error);
  const postgresCode = foundPostgresCode && foundPostgresCode !== prismaCode
    ? foundPostgresCode
    : findLabeledPostgresCode(readStringProperty(error, "message"), prismaCode);
  return {
    stage,
    category: categorizeFailure(prismaCode, postgresCode, transportCode),
    ...(prismaCode ? { prismaCode } : {}),
    ...(postgresCode ? { postgresCode } : {}),
    ...(transportCode ? { transportCode } : {}),
  };
}

export function formatPublicCatalogueFailureDiagnostic(diagnostic: PublicCatalogueFailureDiagnostic) {
  const fields = [`stage=${diagnostic.stage}`, `category=${diagnostic.category}`];
  if (diagnostic.prismaCode) fields.push(`prisma=${diagnostic.prismaCode}`);
  if (diagnostic.postgresCode) fields.push(`postgres=${diagnostic.postgresCode}`);
  if (diagnostic.transportCode) fields.push(`transport=${diagnostic.transportCode}`);
  return fields.join("; ");
}

function assertUnique(values: readonly string[], label: string) {
  if (new Set(values).size !== values.length) {
    throw new PublicCatalogueBootstrapError("INVALID_DEFINITION", `The public catalogue contains a duplicate ${label}.`);
  }
}

export function validatePublicCatalogueDefinitions(
  categories = catalogueCategories,
  products: readonly CatalogueProductDefinition[] = publicCatalogueProducts,
) {
  const counts = {
    categories: categories.length,
    products: products.length,
    variants: products.reduce((total, product) => total + product.variants.length, 0),
    images: products.reduce((total, product) => total + getProductImages(product).length, 0),
  };

  for (const [name, expected] of Object.entries(PUBLIC_CATALOGUE_COUNTS)) {
    if (counts[name as keyof typeof counts] !== expected) {
      throw new PublicCatalogueBootstrapError(
        "INVALID_DEFINITION",
        `The public catalogue must contain exactly ${expected} ${name}.`,
      );
    }
  }

  const categorySlugs = categories.map((category) => category.slug);
  const productSlugs = products.map((product) => product.slug);
  const skus = products.flatMap((product) => product.variants.map((variant) => variant.sku));
  const imageUrls = products.flatMap((product) => getProductImages(product).map((image) => image.url));
  assertUnique(categorySlugs, "category slug");
  assertUnique(productSlugs, "product slug");
  assertUnique(skus, "variant SKU");
  assertUnique(imageUrls, "image URL");

  const categorySet = new Set<string>(categorySlugs);
  for (const product of products) {
    if (!categorySet.has(product.categorySlug)) {
      throw new PublicCatalogueBootstrapError(
        "INVALID_DEFINITION",
        `Product slug ${product.slug} references an unknown category slug.`,
      );
    }
  }

  return counts;
}

type TransactionClient = Prisma.TransactionClient;

function conflict(message: string): never {
  throw new PublicCatalogueBootstrapError("CONFLICT", message);
}

export async function executePublicCatalogueBootstrap(
  transaction: TransactionClient,
  categories: readonly CatalogueCategoryDefinition[] = catalogueCategories,
  products: readonly CatalogueProductDefinition[] = publicCatalogueProducts,
  setStage: (stage: PublicCatalogueBootstrapStage) => void = () => undefined,
): Promise<PublicCatalogueBootstrapResult> {
  validatePublicCatalogueDefinitions(categories, products);
  setStage("concurrency-lock");
  const lockRows = await transaction.$queryRaw<Array<{ acquired: boolean }>>`
    SELECT pg_try_advisory_xact_lock(${PUBLIC_CATALOGUE_LOCK_ID}) AS acquired
  `;
  if (lockRows[0]?.acquired !== true) {
    throw new PublicCatalogueBootstrapError(
      "CONCURRENT_RUN",
      "Another public catalogue bootstrap is already running. No records were committed; retry after that operation finishes.",
    );
  }

  setStage("preflight");
  const categorySlugs = categories.map((category) => category.slug);
  const productSlugs = products.map((product) => product.slug);
  const skus = products.flatMap((product) => product.variants.map((variant) => variant.sku));
  const imageUrls = products.flatMap((product) => getProductImages(product).map((image) => image.url));

  const existingCategories = await transaction.category.findMany({
    where: { slug: { in: categorySlugs } },
    select: { id: true, slug: true },
  });
  const categoryBySlug = new Map(existingCategories.map((category) => [category.slug, category]));

  const existingProducts = await transaction.product.findMany({
    where: { slug: { in: productSlugs } },
    select: { id: true, slug: true, categoryId: true },
  });
  const productBySlug = new Map(existingProducts.map((product) => [product.slug, product]));

  for (const definition of products) {
    const existing = productBySlug.get(definition.slug);
    const expectedCategory = categoryBySlug.get(definition.categorySlug);
    if (existing && existing.categoryId !== expectedCategory?.id) {
      conflict(`Product slug ${definition.slug} already belongs to a different category. Resolve the catalogue ownership conflict before retrying.`);
    }
  }

  const existingVariants = await transaction.productVariant.findMany({
    where: { sku: { in: skus } },
    select: { sku: true, productId: true },
  });
  const variantBySku = new Map(existingVariants.map((variant) => [variant.sku, variant]));
  for (const definition of products) {
    for (const variant of definition.variants) {
      const existing = variantBySku.get(variant.sku);
      if (existing && existing.productId !== productBySlug.get(definition.slug)?.id) {
        conflict(`Variant SKU ${variant.sku} already belongs to a different product. Resolve the catalogue ownership conflict before retrying.`);
      }
    }
  }

  const targetProductIds = existingProducts.map((product) => product.id);
  const existingImages = await transaction.productImage.findMany({
    where: {
      OR: [
        { url: { in: imageUrls } },
        ...(targetProductIds.length ? [{ productId: { in: targetProductIds } }] : []),
      ],
    },
    select: { url: true, sortOrder: true, productId: true },
  });
  const imagesByUrl = new Map<string, typeof existingImages>();
  for (const image of existingImages) {
    imagesByUrl.set(image.url, [...(imagesByUrl.get(image.url) ?? []), image]);
  }
  const imageByPosition = new Map(existingImages.map((image) => [`${image.productId}:${image.sortOrder}`, image]));

  for (const definition of products) {
    for (const [sortOrder, image] of getProductImages(definition).entries()) {
      const expectedProductId = productBySlug.get(definition.slug)?.id;
      const atUrl = imagesByUrl.get(image.url) ?? [];
      if (atUrl.some((existing) => existing.productId !== expectedProductId || existing.sortOrder !== sortOrder)) {
        conflict(`Image path ${image.url} is already associated with a different product or position. Resolve the image ownership conflict before retrying.`);
      }
      const atPosition = expectedProductId ? imageByPosition.get(`${expectedProductId}:${sortOrder}`) : undefined;
      if (atPosition && atPosition.url !== image.url) {
        conflict(`Image position ${sortOrder} for product slug ${definition.slug} is already occupied. Resolve the image position conflict before retrying.`);
      }
    }
  }

  const created = { categories: 0, products: 0, variants: 0, images: 0 };

  setStage("category-creation");
  for (const definition of categories) {
    if (categoryBySlug.has(definition.slug)) continue;
    const category = await transaction.category.create({ data: { ...definition, active: true }, select: { id: true, slug: true } });
    categoryBySlug.set(category.slug, category);
    created.categories += 1;
  }

  for (const definition of products) {
    setStage("product-creation");
    let product = productBySlug.get(definition.slug);
    if (!product) {
      const category = categoryBySlug.get(definition.categorySlug);
      if (!category) throw new PublicCatalogueBootstrapError("INVALID_DEFINITION", `Category slug ${definition.categorySlug} is unavailable.`);
      product = await transaction.product.create({
        data: {
          name: definition.name,
          slug: definition.slug,
          description: definition.description,
          categoryId: category.id,
          active: definition.active ?? true,
          published: definition.published ?? true,
        },
        select: { id: true, slug: true, categoryId: true },
      });
      productBySlug.set(product.slug, product);
      created.products += 1;
    }

    setStage("variant-creation");
    for (const variant of definition.variants) {
      if (variantBySku.has(variant.sku)) continue;
      const createdVariant = await transaction.productVariant.create({
        data: {
          productId: product.id,
          sku: variant.sku,
          name: variant.name,
          size: variant.size ?? null,
          color: variant.color ?? null,
          priceCents: variant.priceCents,
          stockQuantity: variant.stockQuantity,
          active: variant.active ?? true,
        },
        select: { sku: true, productId: true },
      });
      variantBySku.set(createdVariant.sku, createdVariant);
      created.variants += 1;
    }

    setStage("image-creation");
    for (const [sortOrder, image] of getProductImages(definition).entries()) {
      if (imageByPosition.has(`${product.id}:${sortOrder}`)) continue;
      const createdImage = await transaction.productImage.create({
        data: { productId: product.id, url: image.url, altText: image.altText, sortOrder },
        select: { url: true, sortOrder: true, productId: true },
      });
      imageByPosition.set(`${product.id}:${sortOrder}`, createdImage);
      imagesByUrl.set(createdImage.url, [createdImage]);
      created.images += 1;
    }
  }

  return {
    created,
    existing: {
      categories: PUBLIC_CATALOGUE_COUNTS.categories - created.categories,
      products: PUBLIC_CATALOGUE_COUNTS.products - created.products,
      variants: PUBLIC_CATALOGUE_COUNTS.variants - created.variants,
      images: PUBLIC_CATALOGUE_COUNTS.images - created.images,
    },
  };
}

export async function runPublicCatalogueBootstrap(
  database: PrismaClient,
  definitions: {
    categories?: readonly CatalogueCategoryDefinition[];
    products?: readonly CatalogueProductDefinition[];
  } = {},
) {
  let stage: PublicCatalogueBootstrapStage = "transaction-acquisition";
  try {
    return await database.$transaction(
      (transaction) => executePublicCatalogueBootstrap(
        transaction,
        definitions.categories ?? catalogueCategories,
        definitions.products ?? publicCatalogueProducts,
        (nextStage) => { stage = nextStage; },
      ),
      PUBLIC_CATALOGUE_TRANSACTION_OPTIONS,
    );
  } catch (error) {
    if (error instanceof PublicCatalogueBootstrapError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new PublicCatalogueBootstrapError(
        "CONFLICT",
        "A catalogue identifier changed during bootstrap. No records were committed; inspect the slug, SKU, and image ownership before retrying.",
      );
    }
    const diagnostic = classifyPublicCatalogueBootstrapFailure(error, stage);
    throw new PublicCatalogueBootstrapError(
      "DATABASE_FAILURE",
      `The public catalogue bootstrap failed and no records were committed. Diagnostic: ${formatPublicCatalogueFailureDiagnostic(diagnostic)}.`,
      diagnostic,
    );
  }
}
