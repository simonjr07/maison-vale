import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { CART_VERSION } from "../src/cart/cart-domain.ts";
import {
  CheckoutBusinessError,
  CheckoutValidationError,
  createCheckoutService,
} from "../src/server/checkout/checkout-resolver.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const checkout = createCheckoutService(prisma);
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
      slug: `checkout-${name.toLowerCase().replaceAll(" ", "-")}-${fixtureKey}`,
      description: "Temporary checkout verification fixture.",
      categoryId,
      active,
      published,
      variants: {
        create: {
          sku: `CHECKOUT-${name.replaceAll(" ", "-").toUpperCase()}-${fixtureKey}`,
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

async function expectBusinessError(action, code) {
  try {
    await action();
  } catch (error) {
    verify(error instanceof CheckoutBusinessError, `Expected ${code} to be a checkout business error.`);
    verify(error.code === code, `Expected ${code}, received ${error.code}.`);
    return;
  }
  throw new Error(`Expected checkout to reject with ${code}.`);
}

const validDetails = (cart) => ({
  contact: { email: "guest@example.com" },
  shippingAddress: {
    fullName: "Avery Vale",
    line1: "12 Garden Lane",
    line2: "",
    city: "Portland",
    region: "Oregon",
    postalCode: "97205",
    country: "US",
  },
  cart,
  subtotalCents: 1,
  shippingCents: 1,
  taxCents: 999,
  totalCents: 1,
});

try {
  const initialCounts = {
    orders: await prisma.order.count(),
    payments: await prisma.payment.count(),
    movements: await prisma.inventoryMovement.count(),
  };
  const category = await prisma.category.create({
    data: {
      name: "Checkout Verification",
      slug: `checkout-verification-${fixtureKey}`,
      active: true,
    },
  });
  categoryId = category.id;

  const low = await createProduct({ name: "Low Product", priceCents: 5000, stockQuantity: 3 });
  const high = await createProduct({ name: "High Product", priceCents: 16_000, stockQuantity: 2 });
  const hidden = await createProduct({ name: "Hidden Product", active: false, priceCents: 900, stockQuantity: 4 });
  const empty = await createProduct({ name: "Empty Product", priceCents: 700, stockQuantity: 0 });
  const inactive = await createProduct({ name: "Inactive Variant", priceCents: 800, stockQuantity: 3, variantActive: false });

  const lowCart = {
    version: CART_VERSION,
    items: [{ variantId: low.variant.id, quantity: 2, unitPriceCents: 1 }],
    totalCents: 1,
  };
  const standard = await checkout.prepareCheckout(validDetails(lowCart));
  verify(standard.subtotalCents === 10_000, "Checkout did not use the authoritative subtotal.");
  verify(standard.shippingCents === 800, "Standard shipping was not calculated correctly.");
  verify(standard.taxCents === 0, "Tax should be zero in the V1 checkout policy.");
  verify(standard.totalCents === 10_800, "The final checkout total is incorrect.");
  verify(standard.items[0].unitPriceCents === 5000, "A fake client price was not ignored.");
  verify(!("sku" in standard.items[0]), "The checkout DTO exposes an internal SKU.");
  verify(!("stockQuantity" in standard.items[0]), "The checkout DTO exposes raw stock.");

  const free = await checkout.quoteCheckout({
    version: CART_VERSION,
    items: [{ variantId: high.variant.id, quantity: 1 }],
  });
  verify(free.shippingCents === 0, "The free-shipping threshold was not applied.");
  verify(free.totalCents === 16_000, "The free-shipping total is incorrect.");

  const multiLine = await checkout.quoteCheckout({
    version: CART_VERSION,
    items: [
      { variantId: low.variant.id, quantity: 1 },
      { variantId: high.variant.id, quantity: 1 },
    ],
  });
  verify(multiLine.subtotalCents === 21_000, "The multi-line subtotal is incorrect.");
  verify(multiLine.totalCents === 21_000, "The multi-line final total is incorrect.");

  try {
    await checkout.quoteCheckout({ version: CART_VERSION, items: "invalid" });
    throw new Error("Malformed checkout cart was accepted.");
  } catch (error) {
    verify(error instanceof CheckoutValidationError, "Malformed cart did not return a checkout validation error.");
  }

  await expectBusinessError(
    () => checkout.quoteCheckout({ version: CART_VERSION, items: [{ variantId: hidden.variant.id, quantity: 1 }] }),
    "UNAVAILABLE_CART",
  );
  await expectBusinessError(
    () => checkout.quoteCheckout({ version: CART_VERSION, items: [{ variantId: inactive.variant.id, quantity: 1 }] }),
    "UNAVAILABLE_CART",
  );
  await expectBusinessError(
    () => checkout.quoteCheckout({ version: CART_VERSION, items: [{ variantId: empty.variant.id, quantity: 1 }] }),
    "UNAVAILABLE_CART",
  );
  await expectBusinessError(
    () => checkout.quoteCheckout({ version: CART_VERSION, items: [{ variantId: low.variant.id, quantity: 4 }] }),
    "STALE_CART",
  );

  await prisma.productVariant.update({ where: { id: low.variant.id }, data: { priceCents: 5500 } });
  const repriced = await checkout.quoteCheckout({
    version: CART_VERSION,
    items: [{ variantId: low.variant.id, quantity: 1 }],
  });
  verify(repriced.subtotalCents === 5500, "Checkout returned a stale product price.");
  verify(repriced.totalCents === 6300, "Repriced checkout total is incorrect.");

  const finalCounts = {
    orders: await prisma.order.count(),
    payments: await prisma.payment.count(),
    movements: await prisma.inventoryMovement.count(),
  };
  verify(finalCounts.orders === initialCounts.orders, "Checkout created an order.");
  verify(finalCounts.payments === initialCounts.payments, "Checkout created a payment.");
  verify(finalCounts.movements === initialCounts.movements, "Checkout changed inventory.");
  const unchangedStock = await prisma.productVariant.findUnique({
    where: { id: low.variant.id },
    select: { stockQuantity: true },
  });
  verify(unchangedStock?.stockQuantity === 3, "Checkout decremented or reserved stock.");

  console.log("Checkout integration verification passed for authoritative totals, shipping, stale-cart rejection, safe DTOs, and zero commerce writes.");
} finally {
  if (productIds.length > 0) {
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }
  if (categoryId) {
    await prisma.category.deleteMany({ where: { id: categoryId } });
  }
  await prisma.$disconnect();
}
