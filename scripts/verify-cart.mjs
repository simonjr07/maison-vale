import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { CART_VERSION, findChangedPrices } from "../src/cart/cart-domain.ts";
import { createCartResolver } from "../src/server/cart/cart-resolver.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const resolveCart = createCartResolver(prisma);
const fixtureKey = randomUUID();
let categoryId;
const productIds = [];

function verify(condition, message) {
  if (!condition) throw new Error(message);
}

async function createProduct({ name, active = true, published = true, priceCents, stockQuantity, variantActive = true }) {
  const product = await prisma.product.create({
    data: {
      name,
      slug: `cart-${name.toLowerCase().replaceAll(" ", "-")}-${fixtureKey}`,
      description: "Temporary cart verification fixture.",
      categoryId,
      active,
      published,
      variants: {
        create: {
          sku: `CART-${name.replaceAll(" ", "-").toUpperCase()}-${fixtureKey}`,
          name: `${name} variant`,
          priceCents,
          stockQuantity,
          active: variantActive,
        },
      },
    },
    include: { variants: true },
  });
  productIds.push(product.id);
  return { product, variant: product.variants[0] };
}

try {
  const category = await prisma.category.create({
    data: {
      name: "Cart Verification",
      slug: `cart-verification-${fixtureKey}`,
      active: true,
    },
  });
  categoryId = category.id;

  const first = await createProduct({ name: "First Product", priceCents: 1000, stockQuantity: 5 });
  const second = await createProduct({ name: "Second Product", priceCents: 2500, stockQuantity: 2 });
  const hidden = await createProduct({ name: "Hidden Product", active: false, priceCents: 900, stockQuantity: 4 });
  const empty = await createProduct({ name: "Empty Product", priceCents: 700, stockQuantity: 0 });
  const inactive = await createProduct({ name: "Inactive Variant", priceCents: 800, stockQuantity: 3, variantActive: false });

  const valid = await resolveCart({
    version: CART_VERSION,
    items: [
      { variantId: first.variant.id, quantity: 2, unitPriceCents: 1, subtotalCents: 1 },
      { variantId: second.variant.id, quantity: 1, productName: "Fake product" },
    ],
    subtotalCents: 1,
  });
  verify(valid.subtotalCents === 4500, "The multi-line subtotal was not calculated from current prices.");
  verify(valid.items[0].unitPriceCents === 1000, "A fake client price was not ignored.");
  verify(valid.items[0].lineTotalCents === 2000, "The first line total is incorrect.");
  verify(!("stockQuantity" in valid.items[0]), "The cart DTO exposes raw stock quantity.");
  verify(!("sku" in valid.items[0]), "The cart DTO exposes an internal SKU.");

  const hiddenCart = await resolveCart({
    version: CART_VERSION,
    items: [{ variantId: hidden.variant.id, quantity: 1 }],
  });
  verify(hiddenCart.items[0].status === "UNAVAILABLE", "A hidden product remained available.");
  verify(hiddenCart.subtotalCents === 0, "A hidden product contributed to subtotal.");

  const outOfStock = await resolveCart({
    version: CART_VERSION,
    items: [{ variantId: empty.variant.id, quantity: 1 }],
  });
  verify(outOfStock.items[0].status === "OUT_OF_STOCK", "A zero-stock variant was not marked out of stock.");

  const inactiveCart = await resolveCart({
    version: CART_VERSION,
    items: [{ variantId: inactive.variant.id, quantity: 1 }],
  });
  verify(inactiveCart.items[0].status === "UNAVAILABLE", "An inactive variant remained available.");

  const adjusted = await resolveCart({
    version: CART_VERSION,
    items: [{ variantId: first.variant.id, quantity: 8 }],
  });
  verify(adjusted.items[0].status === "ADJUSTED", "Excess quantity was not identified as stale.");
  verify(adjusted.items[0].quantity === 5, "Excess quantity was not clamped to current stock.");
  verify(adjusted.cart.items[0].quantity === 5, "The normalized cart did not retain the adjusted quantity.");

  const beforePriceChange = await resolveCart({
    version: CART_VERSION,
    items: [{ variantId: first.variant.id, quantity: 1 }],
  });
  await prisma.productVariant.update({
    where: { id: first.variant.id },
    data: { priceCents: 1200 },
  });
  const afterPriceChange = await resolveCart({
    version: CART_VERSION,
    items: [{ variantId: first.variant.id, quantity: 1 }],
  });
  verify(afterPriceChange.items[0].unitPriceCents === 1200, "The resolver returned a stale price.");
  verify(findChangedPrices(beforePriceChange, afterPriceChange).has(first.variant.id), "The price change was not detected.");

  console.log("Cart integration verification passed for authoritative pricing, availability, stale quantities, and safe DTOs.");
} finally {
  if (productIds.length > 0) {
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }
  if (categoryId) {
    await prisma.category.deleteMany({ where: { id: categoryId } });
  }
  await prisma.$disconnect();
}
