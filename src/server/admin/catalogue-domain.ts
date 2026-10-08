import { z } from "zod";

export const ADMIN_PAGE_SIZE = 12;
export const CATALOGUE_IMAGE_OPTIONS = [
  "/catalogue/column-trouser.svg",
  "/catalogue/editorial.svg",
  "/catalogue/fold-cardholder.svg",
  "/catalogue/hearth-overshirt.svg",
  "/catalogue/linea-belt.svg",
  "/catalogue/ridge-merino-crew.svg",
  "/catalogue/studio-wool-throw.svg",
  "/catalogue/vale-carryall.svg",
  "/catalogue/vale-rib-cardigan.svg",
] as const;

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).transform((value) => value || null);

const slugSchema = z
  .string()
  .trim()
  .min(2, "Enter a slug.")
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens.");

const checkbox = z.union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((value) => value === "on" || value === "true");

const centsSchema = z.coerce.number().int().min(0).max(100_000_000);

export const adminListQuerySchema = z.object({
  q: z.string().trim().max(120).catch(""),
  page: z.coerce.number().int().min(1).catch(1),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name.").max(180),
  slug: slugSchema,
  description: z.string().trim().min(20, "Add a fuller product description.").max(5_000),
  categoryId: z.string().uuid("Select a category."),
  active: checkbox,
  published: checkbox,
  imageUrl: z.enum(CATALOGUE_IMAGE_OPTIONS).nullable(),
  imageAlt: optionalText(240),
}).superRefine((value, context) => {
  if (value.imageUrl && !value.imageAlt) {
    context.addIssue({ code: "custom", path: ["imageAlt"], message: "Add useful alternative text for the image." });
  }
  if (!value.imageUrl && value.imageAlt) {
    context.addIssue({ code: "custom", path: ["imageUrl"], message: "Select an image or clear its alternative text." });
  }
});

export const variantInputSchema = z.object({
  sku: z.string().trim().toUpperCase().min(2, "Enter a SKU.").max(80)
    .regex(/^[A-Z0-9][A-Z0-9._-]*$/, "Use letters, numbers, periods, underscores, or hyphens."),
  name: z.string().trim().min(1, "Enter a variant name.").max(140),
  size: optionalText(40),
  color: optionalText(80),
  priceCents: centsSchema,
  compareAtPriceCents: z.union([z.literal(""), z.null(), centsSchema]).transform((value) => value === "" ? null : value),
  active: checkbox,
}).superRefine((value, context) => {
  if (value.compareAtPriceCents !== null && value.compareAtPriceCents <= value.priceCents) {
    context.addIssue({ code: "custom", path: ["compareAtPriceCents"], message: "The comparison price must be higher than the selling price." });
  }
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "Enter a category name.").max(120),
  slug: slugSchema,
  description: optionalText(2_000),
  active: checkbox,
});

export const inventoryInputSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0).max(100_000),
  expectedQuantity: z.coerce.number().int().min(0).max(100_000),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function canManageCatalogue(role: "ADMIN" | "STAFF") {
  return role === "ADMIN";
}
