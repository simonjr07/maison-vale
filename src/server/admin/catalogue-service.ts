import { Prisma, type PrismaClient } from "../../generated/prisma/client.ts";

import { createInventoryService } from "../inventory/inventory-service.ts";
import { ADMIN_PAGE_SIZE, type CategoryInput, type ProductInput, type VariantInput } from "./catalogue-domain.ts";

export class CatalogueAdminError extends Error {
  readonly code: "NOT_FOUND" | "DUPLICATE" | "CATEGORY_IN_USE" | "CONCURRENT_MODIFICATION" | "DATABASE_FAILURE";

  constructor(code: "NOT_FOUND" | "DUPLICATE" | "CATEGORY_IN_USE" | "CONCURRENT_MODIFICATION" | "DATABASE_FAILURE", message: string) {
    super(message);
    this.name = "CatalogueAdminError";
    this.code = code;
  }
}

function normalizeError(error: unknown): never {
  if (error instanceof CatalogueAdminError) throw error;
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new CatalogueAdminError("DUPLICATE", "That slug, SKU, or image position is already in use.");
  }
  throw new CatalogueAdminError("DATABASE_FAILURE", "The catalogue could not be updated.");
}

export function createAdminCatalogueService(database: PrismaClient) {
  const inventory = createInventoryService(database);

  async function listProducts(input: { q: string; page: number }) {
    const where: Prisma.ProductWhereInput = input.q ? {
      OR: [
        { name: { contains: input.q, mode: "insensitive" } },
        { slug: { contains: input.q, mode: "insensitive" } },
        { variants: { some: { sku: { contains: input.q, mode: "insensitive" } } } },
      ],
    } : {};
    const [total, products] = await Promise.all([
      database.product.count({ where }),
      database.product.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
        skip: (input.page - 1) * ADMIN_PAGE_SIZE,
        take: ADMIN_PAGE_SIZE,
        select: {
          id: true, name: true, slug: true, active: true, published: true, updatedAt: true,
          category: { select: { name: true, active: true } },
          variants: { select: { priceCents: true, stockQuantity: true, active: true } },
          _count: { select: { images: true } },
        },
      }),
    ]);
    return { products, total, page: input.page, pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
  }

  function listCategories() {
    return database.category.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, description: true, active: true, _count: { select: { products: true } } },
    });
  }

  function getProduct(id: string) {
    return database.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: [{ active: "desc" }, { name: "asc" }], include: { inventoryMovements: { orderBy: { createdAt: "desc" }, take: 5 } } },
      },
    });
  }

  async function createProduct(input: ProductInput, variant: VariantInput) {
    try {
      return await database.$transaction(async (tx) => {
        const category = await tx.category.findFirst({ where: { id: input.categoryId, active: true }, select: { id: true } });
        if (!category) throw new CatalogueAdminError("NOT_FOUND", "Select an active category.");
        return tx.product.create({
          data: {
            name: input.name, slug: input.slug, description: input.description, categoryId: input.categoryId,
            active: input.active, published: input.published,
            variants: { create: { ...variant, stockQuantity: 0 } },
            images: input.imageUrl && input.imageAlt ? { create: { url: input.imageUrl, altText: input.imageAlt, sortOrder: 0 } } : undefined,
          },
          select: { id: true, slug: true },
        });
      });
    } catch (error) { normalizeError(error); }
  }

  async function updateProduct(id: string, input: ProductInput) {
    try {
      return await database.$transaction(async (tx) => {
        const existing = await tx.product.findUnique({ where: { id }, select: { id: true } });
        const category = await tx.category.findUnique({ where: { id: input.categoryId }, select: { id: true, active: true } });
        if (!existing) throw new CatalogueAdminError("NOT_FOUND", "The product was not found.");
        if (!category?.active) throw new CatalogueAdminError("NOT_FOUND", "Select an active category.");
        if (!input.imageUrl || !input.imageAlt) {
          await tx.productImage.deleteMany({ where: { productId: id } });
        } else {
          await tx.productImage.upsert({
            where: { productId_sortOrder: { productId: id, sortOrder: 0 } },
            update: { url: input.imageUrl, altText: input.imageAlt },
            create: { productId: id, url: input.imageUrl, altText: input.imageAlt, sortOrder: 0 },
          });
        }
        return tx.product.update({
          where: { id },
          data: {
            name: input.name, slug: input.slug, description: input.description, categoryId: input.categoryId,
            active: input.active, published: input.published,
          },
          select: { id: true, slug: true },
        });
      });
    } catch (error) { normalizeError(error); }
  }

  async function archiveProduct(id: string) {
    try {
      const result = await database.product.updateMany({ where: { id }, data: { active: false, published: false } });
      if (result.count !== 1) throw new CatalogueAdminError("NOT_FOUND", "The product was not found.");
    } catch (error) { normalizeError(error); }
  }

  async function createVariant(productId: string, input: VariantInput) {
    try {
      const product = await database.product.findUnique({ where: { id: productId }, select: { id: true } });
      if (!product) throw new CatalogueAdminError("NOT_FOUND", "The product was not found.");
      return await database.productVariant.create({ data: { productId, ...input, stockQuantity: 0 } });
    } catch (error) { normalizeError(error); }
  }

  async function updateVariant(id: string, input: VariantInput) {
    try {
      return await database.productVariant.update({ where: { id }, data: input });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new CatalogueAdminError("NOT_FOUND", "The variant was not found.");
      }
      normalizeError(error);
    }
  }

  async function archiveVariant(id: string) {
    try {
      const result = await database.productVariant.updateMany({ where: { id }, data: { active: false } });
      if (result.count !== 1) throw new CatalogueAdminError("NOT_FOUND", "The variant was not found.");
    } catch (error) { normalizeError(error); }
  }

  async function createCategory(input: CategoryInput) {
    try { return await database.category.create({ data: input }); } catch (error) { normalizeError(error); }
  }

  async function updateCategory(id: string, input: CategoryInput) {
    try {
      if (!input.active) {
        const publishedProducts = await database.product.count({ where: { categoryId: id, active: true, published: true } });
        if (publishedProducts > 0) throw new CatalogueAdminError("CATEGORY_IN_USE", "Unpublish or archive the category’s products before deactivating it.");
      }
      return await database.category.update({ where: { id }, data: input });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new CatalogueAdminError("NOT_FOUND", "The category was not found.");
      }
      normalizeError(error);
    }
  }

  async function setInventory(input: { variantId: string; quantity: number; expectedQuantity: number; referenceId: string }) {
    return inventory.setInventory({
      variantId: input.variantId,
      quantity: input.quantity,
      expectedQuantity: input.expectedQuantity,
      reason: "MANUAL_ADJUSTMENT",
      referenceType: "ADMIN_USER",
      referenceId: input.referenceId,
    });
  }

  return { archiveProduct, archiveVariant, createCategory, createProduct, createVariant, getProduct, listCategories, listProducts, setInventory, updateCategory, updateProduct, updateVariant };
}
