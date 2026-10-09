import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { catalogueCategories, getProductImages, publicCatalogueProducts } from "../src/operations/catalogue-seed-data.ts";
import {
  executePublicCatalogueBootstrap,
  PUBLIC_CATALOGUE_LOCK_ID,
  PUBLIC_CATALOGUE_TRANSACTION_OPTIONS,
  PublicCatalogueBootstrapError,
  runPublicCatalogueBootstrap,
} from "../src/operations/public-catalogue-bootstrap.ts";
import { isLocalDatabaseHost } from "../src/server/db/connection-security.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");

let hostname;
try {
  hostname = new URL(connectionString).hostname;
} catch {
  throw new Error("DATABASE_URL is invalid.");
}
if (!isLocalDatabaseHost(hostname)) {
  throw new Error("Public catalogue bootstrap integration tests are restricted to local PostgreSQL.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const key = randomUUID();
const rollbackSignal = new Error("EXPECTED_TEST_ROLLBACK");

function verify(condition, message) {
  if (!condition) throw new Error(message);
}

function createDefinitions(label) {
  const suffix = `${label}-${key}`;
  const categorySlugMap = new Map(catalogueCategories.map((category) => [category.slug, `${category.slug}-${suffix}`]));
  const categories = catalogueCategories.map((category) => ({
    ...category,
    name: `${category.name} ${suffix}`,
    slug: categorySlugMap.get(category.slug),
  }));
  const products = publicCatalogueProducts.map((product) => ({
    ...product,
    name: `${product.name} ${suffix}`,
    slug: `${product.slug}-${suffix}`,
    categorySlug: categorySlugMap.get(product.categorySlug),
    images: getProductImages(product).map((image, index) => ({
      ...image,
      url: `/catalogue/bootstrap-test/${suffix}/${product.slug}-${index}.webp`,
    })),
    variants: product.variants.map((variant, index) => ({
      ...variant,
      sku: `BOOT-${label}-${index}-${key}-${variant.sku}`.slice(0, 80),
    })),
  }));
  return { categories, products };
}

async function expectConflict(action, message) {
  try {
    await action();
  } catch (error) {
    verify(error instanceof PublicCatalogueBootstrapError, "Expected a redacted bootstrap conflict.");
    verify(error.code === "CONFLICT", `Expected CONFLICT, received ${error.code}.`);
    return;
  }
  throw new Error(message);
}

async function getBusinessCounts(database) {
  return [
    await database.user.count(),
    await database.order.count(),
    await database.payment.count(),
    await database.inventoryMovement.count(),
    await database.storeSettings.count(),
  ];
}

try {
  const definitions = createDefinitions("preserve");
  let confirmLockAcquired;
  let releaseLock;
  const lockAcquired = new Promise((resolve) => { confirmLockAcquired = resolve; });
  const lockRelease = new Promise((resolve) => { releaseLock = resolve; });
  const lockHolder = prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(${PUBLIC_CATALOGUE_LOCK_ID})::text AS lock_state`;
    confirmLockAcquired();
    await lockRelease;
  }, PUBLIC_CATALOGUE_TRANSACTION_OPTIONS);
  await lockAcquired;
  try {
    await runPublicCatalogueBootstrap(prisma, definitions);
    throw new Error("A concurrent bootstrap was not rejected.");
  } catch (error) {
    verify(error instanceof PublicCatalogueBootstrapError && error.code === "CONCURRENT_RUN", "A concurrent bootstrap did not fail safely before writes.");
  } finally {
    releaseLock();
    await lockHolder;
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const businessCountsBefore = await getBusinessCounts(transaction);

      const first = await executePublicCatalogueBootstrap(transaction, definitions.categories, definitions.products);
      verify(JSON.stringify(first.created) === JSON.stringify({ categories: 4, products: 8, variants: 20, images: 24 }), "The first bootstrap did not create the exact public catalogue counts.");

      const product = await transaction.product.findUniqueOrThrow({ where: { slug: definitions.products[0].slug } });
      const variant = await transaction.productVariant.findUniqueOrThrow({ where: { sku: definitions.products[0].variants[0].sku } });
      await transaction.category.update({ where: { slug: definitions.categories[0].slug }, data: { name: "Preserved category edit", active: false } });
      await transaction.product.update({ where: { id: product.id }, data: { name: "Preserved product edit", description: "Preserved description.", active: false, published: false } });
      await transaction.productVariant.update({ where: { id: variant.id }, data: { name: "Preserved variant edit", priceCents: 7777, stockQuantity: 17, active: false } });
      await transaction.productImage.update({ where: { productId_sortOrder: { productId: product.id, sortOrder: 0 } }, data: { altText: "Preserved image edit" } });

      const second = await executePublicCatalogueBootstrap(transaction, definitions.categories, definitions.products);
      verify(Object.values(second.created).every((count) => count === 0), "An idempotent rerun modified the catalogue.");
      const preserved = await transaction.product.findUniqueOrThrow({ where: { id: product.id } });
      const preservedCategory = await transaction.category.findUniqueOrThrow({ where: { id: product.categoryId } });
      const preservedVariant = await transaction.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
      const preservedImage = await transaction.productImage.findUniqueOrThrow({ where: { productId_sortOrder: { productId: product.id, sortOrder: 0 } } });
      verify(preserved.name === "Preserved product edit" && preserved.description === "Preserved description." && !preserved.active && !preserved.published, "The rerun overwrote product changes.");
      verify(preservedCategory.name === "Preserved category edit" && !preservedCategory.active, "The rerun overwrote category changes.");
      verify(preservedVariant.priceCents === 7777 && preservedVariant.stockQuantity === 17 && !preservedVariant.active, "The rerun overwrote variant pricing, stock, or status.");
      verify(preservedImage.altText === "Preserved image edit", "The rerun overwrote image metadata.");

      const conflictDefinitions = createDefinitions("conflict");
      conflictDefinitions.products[0].variants[0].sku = definitions.products[0].variants[0].sku;
      await expectConflict(
        () => executePublicCatalogueBootstrap(transaction, conflictDefinitions.categories, conflictDefinitions.products),
        "A cross-product SKU collision was not rejected.",
      );
      verify(await transaction.category.count({ where: { slug: { in: conflictDefinitions.categories.map((category) => category.slug) } } }) === 0, "A failed preflight wrote catalogue records.");

      const imageConflictDefinitions = createDefinitions("image-conflict");
      const imageCategory = await transaction.category.create({ data: { ...imageConflictDefinitions.categories[0], active: true } });
      const imageProduct = await transaction.product.create({
        data: {
          name: imageConflictDefinitions.products[0].name,
          slug: imageConflictDefinitions.products[0].slug,
          description: imageConflictDefinitions.products[0].description,
          categoryId: imageCategory.id,
          active: true,
          published: true,
        },
      });
      await transaction.productImage.create({ data: { productId: imageProduct.id, url: `/catalogue/bootstrap-test/${key}/occupied.webp`, altText: "Occupied", sortOrder: 0 } });
      await expectConflict(
        () => executePublicCatalogueBootstrap(transaction, imageConflictDefinitions.categories, imageConflictDefinitions.products),
        "An occupied image position was not rejected.",
      );

      const businessCountsAfter = await getBusinessCounts(transaction);
      verify(JSON.stringify(businessCountsAfter) === JSON.stringify(businessCountsBefore), "The catalogue bootstrap changed non-catalogue business records.");
      throw rollbackSignal;
    });
  } catch (error) {
    if (error !== rollbackSignal) throw error;
  }

  verify(await prisma.category.count({ where: { slug: { in: definitions.categories.map((category) => category.slug) } } }) === 0, "The rollback-only integration transaction committed test records.");

  const rollbackDefinitions = createDefinitions("rollback");
  const lastProduct = rollbackDefinitions.products.at(-1);
  lastProduct.variants.at(-1).priceCents = -1;
  try {
    await runPublicCatalogueBootstrap(prisma, rollbackDefinitions);
    throw new Error("A database constraint failure did not reject the bootstrap.");
  } catch (error) {
    verify(error instanceof PublicCatalogueBootstrapError && error.code === "DATABASE_FAILURE", "The database failure was not normalized safely.");
    verify(error.diagnostic?.stage === "variant-creation", "The database failure did not identify its safe operation stage.");
    verify(error.diagnostic?.category === "driver", `The adapter-level database failure was not categorized safely: ${JSON.stringify(error.diagnostic)}.`);
    verify(error.diagnostic?.prismaCode === "P2039", "The adapter-level Prisma code was not retained.");
    verify(!error.message.includes("rollback-test"), "The diagnostic exposed underlying database details.");
  }
  verify(await prisma.category.count({ where: { slug: { in: rollbackDefinitions.categories.map((category) => category.slug) } } }) === 0, "A failed bootstrap did not roll back all catalogue creations.");

  console.log("Public catalogue bootstrap integration verification passed: exact counts, concurrent-run rejection, additive preservation, idempotency, conflict preflight, redacted diagnostics, business-data isolation, and transaction rollback.");
} finally {
  await prisma.$disconnect();
}
