import { getVariantAvailability } from "../inventory/inventory-domain";

export type CatalogueImageRecord = {
  url: string;
  altText: string;
  sortOrder: number;
};

export type CatalogueVariantRecord = {
  name: string;
  size: string | null;
  color: string | null;
  priceCents: number;
  stockQuantity: number;
  active: boolean;
};

export type CatalogueProductRecord = {
  name: string;
  slug: string;
  description: string;
  active: boolean;
  published: boolean;
  category: {
    name: string;
    slug: string;
    active: boolean;
  };
  variants: CatalogueVariantRecord[];
  images: CatalogueImageRecord[];
};

export type CatalogueCategoryRecord = {
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
};

export type ProductCardDto = {
  name: string;
  slug: string;
  category: { name: string; slug: string };
  price: string;
  availability: "In stock" | "Out of stock" | "Unavailable";
  image: { url: string; alt: string };
};

export type ProductDetailDto = ProductCardDto & {
  description: string;
  images: Array<{ url: string; alt: string }>;
  variants: Array<{
    name: string;
    size: string | null;
    color: string | null;
    price: string;
    availability: "In stock" | "Out of stock" | "Unavailable";
  }>;
};

export const FALLBACK_IMAGE = {
  url: "/catalogue/fallback.svg",
  alt: "Maison Vale product image placeholder",
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatUsd(priceCents: number) {
  return usdFormatter.format(priceCents / 100);
}
export function getPriceDisplay(variants: CatalogueVariantRecord[]) {
  const activePrices = variants
    .filter((variant) => variant.active)
    .map((variant) => variant.priceCents);

  if (activePrices.length === 0) return "Price unavailable";

  const lowestPrice = Math.min(...activePrices);
  const highestPrice = Math.max(...activePrices);

  return lowestPrice === highestPrice
    ? formatUsd(lowestPrice)
    : `From ${formatUsd(lowestPrice)}`;
}

export function selectPrimaryImage(images: CatalogueImageRecord[]) {
  const primary = [...images].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  )[0];

  return primary
    ? { url: primary.url, alt: primary.altText }
    : FALLBACK_IMAGE;
}

export function isPublicProduct(product: CatalogueProductRecord) {
  return product.active && product.published && product.category.active;
}

export function filterPublishedProducts(products: CatalogueProductRecord[]) {
  return products.filter(isPublicProduct);
}

export function filterProductsByCategory(
  products: CatalogueProductRecord[],
  categorySlug: string,
) {
  return filterPublishedProducts(products).filter(
    (product) => product.category.slug === categorySlug,
  );
}

export function findActiveCategoryBySlug(
  categories: CatalogueCategoryRecord[],
  categorySlug: string,
) {
  return (
    categories.find(
      (category) => category.active && category.slug === categorySlug,
    ) ?? null
  );
}

export function findPublishedProductBySlug(
  products: CatalogueProductRecord[],
  productSlug: string,
) {
  return (
    filterPublishedProducts(products).find(
      (product) => product.slug === productSlug,
    ) ?? null
  );
}

function getProductAvailability(product: CatalogueProductRecord) {
  if (product.variants.length === 0) {
    return "Unavailable" as const;
  }

  const availability = product.variants.map((variant) =>
    getVariantAvailability({
      productActive: product.active,
      productPublished: product.published,
      variantActive: variant.active,
      stockQuantity: variant.stockQuantity,
    }),
  );

  return availability.includes("In stock")
    ? ("In stock" as const)
    : availability.includes("Out of stock")
      ? ("Out of stock" as const)
      : ("Unavailable" as const);
}

export function toProductCardDto(
  product: CatalogueProductRecord,
): ProductCardDto {
  return {
    name: product.name,
    slug: product.slug,
    category: {
      name: product.category.name,
      slug: product.category.slug,
    },
    price: getPriceDisplay(product.variants),
    availability: getProductAvailability(product),
    image: selectPrimaryImage(product.images),
  };
}

export function toProductDetailDto(
  product: CatalogueProductRecord,
): ProductDetailDto {
  return {
    ...toProductCardDto(product),
    description: product.description,
    images:
      product.images.length > 0
        ? [...product.images]
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((image) => ({ url: image.url, alt: image.altText }))
        : [FALLBACK_IMAGE],
    variants: product.variants.map((variant) => ({
      name: variant.name,
      size: variant.size,
      color: variant.color,
      price: formatUsd(variant.priceCents),
      availability: getVariantAvailability({
        productActive: product.active,
        productPublished: product.published,
        variantActive: variant.active,
        stockQuantity: variant.stockQuantity,
      }),
    })),
  };
}
