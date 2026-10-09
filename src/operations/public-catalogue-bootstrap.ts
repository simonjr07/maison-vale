import { Prisma, type PrismaClient } from "../generated/prisma/client.ts";

import {
  catalogueCategories,
  getProductImages,
  publicCatalogueProducts,
  type CatalogueProductDefinition,
  type CatalogueCategoryDefinition,
} from "./catalogue-seed-data.ts";

const PUBLIC_CATALOGUE_LOCK_ID = BigInt("4698307722026100");

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
  readonly code: "INVALID_DEFINITION" | "CONFLICT" | "DATABASE_FAILURE";

  constructor(code: PublicCatalogueBootstrapError["code"], message: string) {
    super(message);
    this.name = "PublicCatalogueBootstrapError";
    this.code = code;
  }
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
): Promise<PublicCatalogueBootstrapResult> {
  validatePublicCatalogueDefinitions(categories, products);
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${PUBLIC_CATALOGUE_LOCK_ID})`;

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

  for (const definition of categories) {
    if (categoryBySlug.has(definition.slug)) continue;
    const category = await transaction.category.create({ data: { ...definition, active: true }, select: { id: true, slug: true } });
    categoryBySlug.set(category.slug, category);
    created.categories += 1;
  }

  for (const definition of products) {
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
  try {
    return await database.$transaction(
      (transaction) => executePublicCatalogueBootstrap(
        transaction,
        definitions.categories ?? catalogueCategories,
        definitions.products ?? publicCatalogueProducts,
      ),
      { timeout: 30_000 },
    );
  } catch (error) {
    if (error instanceof PublicCatalogueBootstrapError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new PublicCatalogueBootstrapError(
        "CONFLICT",
        "A catalogue identifier changed during bootstrap. No records were committed; inspect the slug, SKU, and image ownership before retrying.",
      );
    }
    throw new PublicCatalogueBootstrapError(
      "DATABASE_FAILURE",
      "The public catalogue bootstrap failed and no records were committed.",
    );
  }
}
