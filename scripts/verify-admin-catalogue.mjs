import "dotenv/config";

import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { createAdminCatalogueService, CatalogueAdminError } from "../src/server/admin/catalogue-service.ts";
import { InventoryError } from "../src/server/inventory/inventory-domain.ts";
import { CART_VERSION } from "../src/cart/cart-domain.ts";
import { createCartResolver } from "../src/server/cart/cart-resolver.ts";
import { CheckoutBusinessError, createCheckoutService } from "../src/server/checkout/checkout-resolver.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const service = createAdminCatalogueService(prisma);
const resolveCart = createCartResolver(prisma);
const checkout = createCheckoutService(prisma);
const key = randomUUID();
const ids = { categories: [], products: [], variants: [] };

function verify(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectError(action, Type, code) {
  try { await action(); } catch (error) {
    verify(error instanceof Type, `Expected ${Type.name}.`);
    verify(error.code === code, `Expected ${code}, received ${error.code}.`);
    return;
  }
  throw new Error(`Expected ${code}.`);
}

const productInput = (categoryId, suffix = "one") => ({
  name: `Admin verification ${suffix}`,
  slug: `admin-verification-${key}-${suffix}`,
  description: "A temporary product used to verify administrative catalogue behavior.",
  categoryId,
  active: true,
  published: false,
  imageUrl: "/catalogue/editorial.svg",
  imageAlt: "Temporary Maison Vale verification product",
});
const variantInput = (suffix = "ONE") => ({
  sku: `ADMIN-${key}-${suffix}`.toUpperCase(), name: `Variant ${suffix}`, size: null, color: "Stone",
  priceCents: 12500, compareAtPriceCents: null, active: true,
});

try {
  const category = await service.createCategory({
    name: "Admin verification", slug: `admin-verification-${key}`, description: "Temporary integration fixture.", active: true,
  });
  ids.categories.push(category.id);

  const created = await service.createProduct(productInput(category.id), variantInput());
  ids.products.push(created.id);
  const product = await service.getProduct(created.id);
  verify(product?.variants.length === 1, "Product creation did not atomically create its first variant.");
  verify(product?.variants[0].stockQuantity === 0, "A new variant did not begin with zero inventory.");
  ids.variants.push(product.variants[0].id);

  await expectError(
    () => service.createProduct(productInput(category.id, "duplicate-sku"), variantInput()),
    CatalogueAdminError,
    "DUPLICATE",
  );
  verify(await prisma.product.count({ where: { slug: `admin-verification-${key}-duplicate-sku` } }) === 0, "Failed product creation was not rolled back.");

  await service.updateProduct(created.id, { ...productInput(category.id), name: "Admin verification updated", published: true });
  const visible = await prisma.product.findFirst({ where: { id: created.id, active: true, published: true, category: { active: true } } });
  verify(Boolean(visible), "Published product did not satisfy storefront visibility rules.");

  const second = await service.createVariant(created.id, variantInput("TWO"));
  ids.variants.push(second.id);
  await service.updateVariant(second.id, { ...variantInput("TWO"), priceCents: 13900 });

  const inventory = await service.setInventory({ variantId: second.id, quantity: 8, expectedQuantity: 0, referenceId: key });
  verify(inventory.stockQuantity === 8 && inventory.movement.quantityDelta === 8, "Inventory adjustment or movement was incorrect.");
  await expectError(
    () => service.setInventory({ variantId: second.id, quantity: 4, expectedQuantity: 0, referenceId: key }),
    InventoryError,
    "CONCURRENT_MODIFICATION",
  );
  verify(await prisma.inventoryMovement.count({ where: { productVariantId: second.id } }) === 1, "Rejected stale inventory created a movement.");

  const cartPayload = { version: CART_VERSION, items: [{ variantId: second.id, quantity: 2 }] };
  const availableCart = await resolveCart(cartPayload);
  verify(availableCart.items[0].status === "AVAILABLE", "Admin stock did not synchronize with cart availability.");
  const quote = await checkout.quoteCheckout(cartPayload);
  verify(quote.items[0].unitPriceCents === 13900, "Admin pricing did not synchronize with checkout authority.");

  await expectError(
    () => service.updateCategory(category.id, { name: category.name, slug: category.slug, description: category.description, active: false }),
    CatalogueAdminError,
    "CATEGORY_IN_USE",
  );
  await service.archiveVariant(second.id);
  verify((await prisma.productVariant.findUniqueOrThrow({ where: { id: second.id } })).active === false, "Variant archive did not preserve and deactivate the record.");
  const archivedCart = await resolveCart(cartPayload);
  verify(archivedCart.items[0].status === "UNAVAILABLE", "Archived variant remained available to the cart.");
  await expectError(() => checkout.quoteCheckout(cartPayload), CheckoutBusinessError, "UNAVAILABLE_CART");
  await service.archiveProduct(created.id);
  const archived = await prisma.product.findUniqueOrThrow({ where: { id: created.id } });
  verify(!archived.active && !archived.published, "Product archive did not deactivate and unpublish the product.");
  await service.updateCategory(category.id, { name: category.name, slug: category.slug, description: category.description, active: false });

  console.log("Admin catalogue integration verification passed: transactions, uniqueness, storefront/cart/checkout visibility, archival, category safety, inventory audit, and stale-write protection.");
} finally {
  if (ids.variants.length) await prisma.inventoryMovement.deleteMany({ where: { productVariantId: { in: ids.variants } } });
  if (ids.products.length) await prisma.product.deleteMany({ where: { id: { in: ids.products } } });
  if (ids.categories.length) await prisma.category.deleteMany({ where: { id: { in: ids.categories } } });
  await prisma.$disconnect();
}
