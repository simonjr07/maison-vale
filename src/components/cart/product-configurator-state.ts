import type { ProductDetailDto } from "@/server/catalogue/catalogue-core";

export type ProductVariantOption = ProductDetailDto["variants"][number];

export type AddedToBagNotice = {
  title: "Added to bag";
  detail: string;
};

export function isVariantSelectable(variant: ProductVariantOption) {
  return variant.availability !== "Unavailable";
}

export function canAddVariant(
  variant: ProductVariantOption | undefined,
) {
  return variant?.availability === "In stock";
}

export function getInitialVariantId(variants: ProductVariantOption[]) {
  return variants.find(canAddVariant)?.id
    ?? variants.find(isVariantSelectable)?.id
    ?? "";
}

export function getSelectedVariant(
  variants: ProductVariantOption[],
  selectedVariantId: string,
) {
  return variants.find((variant) => variant.id === selectedVariantId);
}

export function createAddedToBagNotice(
  variantName: string,
  adjustmentMessage?: string | null,
): AddedToBagNotice {
  return {
    title: "Added to bag",
    detail: adjustmentMessage
      ? `${adjustmentMessage} Your bag has been updated.`
      : `${variantName} is now in your bag.`,
  };
}
