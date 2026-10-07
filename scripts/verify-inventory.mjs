import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { InventoryError } from "../src/server/inventory/inventory-domain.ts";
import { createInventoryService } from "../src/server/inventory/inventory-service.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const inventory = createInventoryService(prisma);
const fixtureKey = randomUUID();
const categorySlug = `inventory-verification-${fixtureKey}`;
let variantId;
let productId;
let categoryId;

function verify(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectInventoryError(action, code) {
  try {
    await action();
  } catch (error) {
    verify(error instanceof InventoryError, "Expected a domain inventory error.");
    verify(error.code === code, `Expected ${code}, received ${error.code}.`);
    return;
  }

  throw new Error(`Expected inventory operation to fail with ${code}.`);
}

try {
  const category = await prisma.category.create({
    data: { name: "Inventory Verification", slug: categorySlug, active: true },
  });
  categoryId = category.id;

  const product = await prisma.product.create({
    data: {
      name: "Inventory Verification Product",
      slug: `inventory-verification-product-${fixtureKey}`,
      description: "Temporary inventory verification fixture.",
      categoryId: category.id,
      active: true,
      published: true,
    },
  });
  productId = product.id;

  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: `INV-${fixtureKey}`,
      name: "Verification variant",
      priceCents: 1000,
      stockQuantity: 1,
      active: true,
    },
  });
  variantId = variant.id;

  const increased = await inventory.increaseInventory({
    variantId,
    quantity: 2,
    reason: "RESTOCK",
  });
  verify(increased.stockQuantity === 3, "Stock increase did not produce quantity 3.");
  verify(increased.movement.quantityDelta === 2, "Restock movement delta was incorrect.");

  const decreased = await inventory.decreaseInventory({
    variantId,
    quantity: 1,
    reason: "MANUAL_ADJUSTMENT",
  });
  verify(decreased.stockQuantity === 2, "Stock decrease did not produce quantity 2.");

  const exact = await inventory.decreaseInventory({
    variantId,
    quantity: 2,
    reason: "ORDER",
    referenceType: "TEST_ORDER",
    referenceId: "exact-stock",
  });
  verify(exact.stockQuantity === 0, "Exact-stock decrement did not produce quantity 0.");

  const movementCountBeforeFailure = await prisma.inventoryMovement.count({
    where: { productVariantId: variantId },
  });
  await expectInventoryError(
    () => inventory.decreaseInventory({ variantId, quantity: 1, reason: "ORDER" }),
    "INSUFFICIENT_STOCK",
  );
  const movementCountAfterFailure = await prisma.inventoryMovement.count({
    where: { productVariantId: variantId },
  });
  verify(
    movementCountAfterFailure === movementCountBeforeFailure,
    "A failed decrement created an audit movement.",
  );

  await inventory.setInventory({
    variantId,
    quantity: 1,
    reason: "CORRECTION",
  });

  const concurrentResults = await Promise.allSettled([
    inventory.decreaseInventory({
      variantId,
      quantity: 1,
      reason: "ORDER",
      referenceType: "TEST_ORDER",
      referenceId: "concurrent-a",
    }),
    inventory.decreaseInventory({
      variantId,
      quantity: 1,
      reason: "ORDER",
      referenceType: "TEST_ORDER",
      referenceId: "concurrent-b",
    }),
  ]);

  const fulfilled = concurrentResults.filter((result) => result.status === "fulfilled");
  const rejected = concurrentResults.filter((result) => result.status === "rejected");
  verify(fulfilled.length === 1, "Exactly one concurrent decrement should succeed.");
  verify(rejected.length === 1, "Exactly one concurrent decrement should fail.");
  verify(
    rejected[0].reason instanceof InventoryError &&
      rejected[0].reason.code === "INSUFFICIENT_STOCK",
    "The losing concurrent decrement should report insufficient stock.",
  );

  const finalVariant = await prisma.productVariant.findUniqueOrThrow({
    where: { id: variantId },
    select: { stockQuantity: true },
  });
  verify(finalVariant.stockQuantity === 0, "Concurrent decrement left an invalid stock level.");

  const concurrentMovements = await prisma.inventoryMovement.count({
    where: {
      productVariantId: variantId,
      reason: "ORDER",
      referenceId: { in: ["concurrent-a", "concurrent-b"] },
    },
  });
  verify(concurrentMovements === 1, "Concurrency audit history should record one successful decrement.");

  let databaseRejectedNegativeStock = false;
  try {
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { stockQuantity: -1 },
    });
  } catch {
    databaseRejectedNegativeStock = true;
  }
  verify(databaseRejectedNegativeStock, "The database accepted a negative stock quantity.");

  console.log("Inventory integration verification passed, including the concurrent one-unit decrement scenario.");
} finally {
  if (variantId) {
    await prisma.inventoryMovement.deleteMany({ where: { productVariantId: variantId } });
  }
  if (productId) {
    await prisma.product.deleteMany({ where: { id: productId } });
  }
  if (categoryId) {
    await prisma.category.deleteMany({ where: { id: categoryId } });
  }
  await prisma.$disconnect();
}
