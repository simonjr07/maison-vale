import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { catalogueCategories, developmentSeedProducts, getProductImages } from "../src/operations/catalogue-seed-data.ts";
import { runPublicCatalogueBootstrap } from "../src/operations/public-catalogue-bootstrap.ts";
import { assertDevelopmentSeedAllowed, assertPublicCatalogueBootstrapAllowed } from "../src/operations/runtime-safety.ts";

const publicCatalogueOnly = process.argv.slice(2).includes("--public-catalogue-only");
const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error("DATABASE_URL is not configured.");

if (publicCatalogueOnly) {
  assertPublicCatalogueBootstrapAllowed({
    databaseUrl: connectionString,
    directUrl: process.env.DIRECT_URL,
    allowRemoteSeed: process.env.ALLOW_REMOTE_SEED,
    dotenvConfigPath: process.env.DOTENV_CONFIG_PATH,
    workingDirectory: process.cwd(),
    vercel: process.env.VERCEL,
  });
} else {
  assertDevelopmentSeedAllowed({
    connectionString,
    nodeEnv: process.env.NODE_ENV,
    allowRemoteSeed: process.env.ALLOW_REMOTE_SEED,
  });
}

const adapterConfig = publicCatalogueOnly
  ? { connectionString, max: 1, connectionTimeoutMillis: 30_000, idleTimeoutMillis: 10_000 }
  : { connectionString };
const prisma = new PrismaClient({ adapter: new PrismaPg(adapterConfig) });

async function runDevelopmentSeed() {
  await prisma.storeSettings.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: { storeName: "Maison Vale", currency: "USD" },
    create: { id: "00000000-0000-4000-8000-000000000001", storeName: "Maison Vale", currency: "USD" },
  });

  const categoryBySlug = new Map();
  for (const categoryData of catalogueCategories) {
    const category = await prisma.category.upsert({
      where: { slug: categoryData.slug },
      update: { ...categoryData, active: true },
      create: { ...categoryData, active: true },
    });
    categoryBySlug.set(category.slug, category);
  }

  for (const productData of developmentSeedProducts) {
    const category = categoryBySlug.get(productData.categorySlug);
    if (!category) throw new Error(`Missing category ${productData.categorySlug}.`);

    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {
        name: productData.name,
        description: productData.description,
        categoryId: category.id,
        active: productData.active ?? true,
        published: productData.published ?? true,
      },
      create: {
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        categoryId: category.id,
        active: productData.active ?? true,
        published: productData.published ?? true,
      },
    });

    for (const [sortOrder, image] of getProductImages(productData).entries()) {
      await prisma.productImage.upsert({
        where: { productId_sortOrder: { productId: product.id, sortOrder } },
        update: { url: image.url, altText: image.altText },
        create: { productId: product.id, url: image.url, altText: image.altText, sortOrder },
      });
    }

    for (const variant of productData.variants) {
      await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        update: {
          productId: product.id,
          name: variant.name,
          size: variant.size ?? null,
          color: variant.color ?? null,
          priceCents: variant.priceCents,
          active: variant.active ?? true,
        },
        create: {
          productId: product.id,
          sku: variant.sku,
          name: variant.name,
          size: variant.size ?? null,
          color: variant.color ?? null,
          priceCents: variant.priceCents,
          stockQuantity: variant.stockQuantity,
          active: variant.active ?? true,
        },
      });
    }
  }

  console.log(`Development seed completed: ${catalogueCategories.length} categories, ${developmentSeedProducts.length} products, and curated variants and images.`);
}

async function main() {
  if (!publicCatalogueOnly) return runDevelopmentSeed();

  const result = await runPublicCatalogueBootstrap(prisma);
  console.log(
    `Public catalogue bootstrap completed: created ${result.created.categories} categories, ${result.created.products} products, ${result.created.variants} variants, and ${result.created.images} image references. Existing matching records were preserved.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    if (publicCatalogueOnly && error instanceof Error) console.error(error.message);
    else console.error("Development seed failed. Confirm that PostgreSQL is running and the database variables are valid.");
    await prisma.$disconnect();
    process.exit(1);
  });
