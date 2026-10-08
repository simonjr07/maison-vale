"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";

import { requireAdmin } from "@/server/auth/authorization";
import {
  CatalogueAdminError,
  createAdminCatalogueService,
} from "@/server/admin/catalogue-service";
import {
  categoryInputSchema,
  inventoryInputSchema,
  productInputSchema,
  variantInputSchema,
} from "@/server/admin/catalogue-domain";
import { db } from "@/server/db/client";
import { InventoryError } from "@/server/inventory/inventory-domain";

export type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
  errors?: Record<string, string[]>;
};

const service = createAdminCatalogueService(db);

function fields(error: ZodError) {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

function errorState(error: unknown): AdminActionState {
  if (error instanceof CatalogueAdminError || error instanceof InventoryError) {
    return { status: "error", message: error.message };
  }
  return { status: "error", message: "The change could not be saved. Please try again." };
}

function productValues(formData: FormData) {
  return {
    name: formData.get("name"), slug: formData.get("slug"), description: formData.get("description"),
    categoryId: formData.get("categoryId"), active: formData.get("active") ?? "",
    published: formData.get("published") ?? "", imageUrl: formData.get("imageUrl") || null,
    imageAlt: formData.get("imageAlt") ?? "",
  };
}

function variantValues(formData: FormData, prefix = "") {
  const value = (name: string) => formData.get(`${prefix}${name}`);
  return {
    sku: value("sku"), name: value("name"), size: value("size") ?? "", color: value("color") ?? "",
    priceCents: value("priceCents"), compareAtPriceCents: value("compareAtPriceCents") ?? "",
    active: value("active") ?? "",
  };
}

function refreshCatalogue(slug?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/collections/[slug]", "page");
  if (slug) revalidatePath(`/shop/${slug}`);
}

export async function createProductAction(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const product = productInputSchema.safeParse(productValues(formData));
  const variant = variantInputSchema.safeParse(variantValues(formData, "variant"));
  if (!product.success || !variant.success) {
    return {
      status: "error", message: "Review the highlighted fields.",
      errors: { ...(product.success ? {} : fields(product.error)), ...(variant.success ? {} : Object.fromEntries(Object.entries(fields(variant.error)).map(([key, value]) => [`variant${key}`, value]))) },
    };
  }
  let created: { id: string; slug: string };
  try { created = await service.createProduct(product.data, variant.data); }
  catch (error) { return errorState(error); }
  refreshCatalogue(created.slug);
  redirect(`/admin/products/${created.id}?notice=created`);
}

export async function updateProductAction(id: string, _state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = productInputSchema.safeParse(productValues(formData));
  if (!parsed.success) return { status: "error", message: "Review the highlighted fields.", errors: fields(parsed.error) };
  try {
    const updated = await service.updateProduct(id, parsed.data);
    refreshCatalogue(updated.slug);
    return { status: "success", message: "Product details saved." };
  } catch (error) { return errorState(error); }
}

export async function archiveProductAction(id: string, state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  void state;
  void formData;
  const user = await requireAdmin();
  try {
    await service.archiveProduct(id);
    refreshCatalogue();
    return { status: "success", message: `Product archived by ${user.email}. It is no longer visible in the storefront.` };
  } catch (error) { return errorState(error); }
}

export async function createVariantAction(productId: string, _state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = variantInputSchema.safeParse(variantValues(formData));
  if (!parsed.success) return { status: "error", message: "Review the variant fields.", errors: fields(parsed.error) };
  try {
    await service.createVariant(productId, parsed.data);
    refreshCatalogue();
    revalidatePath(`/admin/products/${productId}`);
    return { status: "success", message: "Variant added with an opening stock level of zero." };
  } catch (error) { return errorState(error); }
}

export async function updateVariantAction(id: string, _state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = variantInputSchema.safeParse(variantValues(formData));
  if (!parsed.success) return { status: "error", message: "Review the variant fields.", errors: fields(parsed.error) };
  try {
    await service.updateVariant(id, parsed.data);
    refreshCatalogue();
    return { status: "success", message: "Variant saved." };
  } catch (error) { return errorState(error); }
}

export async function archiveVariantAction(id: string, state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  void state;
  void formData;
  await requireAdmin();
  try {
    await service.archiveVariant(id);
    refreshCatalogue();
    return { status: "success", message: "Variant archived. Historical order records remain intact." };
  } catch (error) { return errorState(error); }
}

export async function setInventoryAction(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const user = await requireAdmin();
  const parsed = inventoryInputSchema.safeParse({
    variantId: formData.get("variantId"), quantity: formData.get("quantity"), expectedQuantity: formData.get("expectedQuantity"),
  });
  if (!parsed.success) return { status: "error", message: "Enter a whole stock quantity from 0 to 100,000.", errors: fields(parsed.error) };
  try {
    const result = await service.setInventory({ ...parsed.data, referenceId: user.id });
    refreshCatalogue();
    return { status: "success", message: `Inventory updated to ${result.stockQuantity}. The adjustment was recorded.` };
  } catch (error) { return errorState(error); }
}

function categoryValues(formData: FormData) {
  return { name: formData.get("name"), slug: formData.get("slug"), description: formData.get("description") ?? "", active: formData.get("active") ?? "" };
}

export async function createCategoryAction(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = categoryInputSchema.safeParse(categoryValues(formData));
  if (!parsed.success) return { status: "error", message: "Review the category fields.", errors: fields(parsed.error) };
  try {
    await service.createCategory(parsed.data);
    refreshCatalogue();
    return { status: "success", message: "Category created." };
  } catch (error) { return errorState(error); }
}

export async function updateCategoryAction(id: string, _state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = categoryInputSchema.safeParse(categoryValues(formData));
  if (!parsed.success) return { status: "error", message: "Review the category fields.", errors: fields(parsed.error) };
  try {
    await service.updateCategory(id, parsed.data);
    refreshCatalogue();
    return { status: "success", message: "Category saved." };
  } catch (error) { return errorState(error); }
}
