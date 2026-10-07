import "server-only";

import { cache } from "react";

import { db } from "@/server/db/client";

import {
  type CatalogueProductRecord,
  type ProductCardDto,
  type ProductDetailDto,
  toProductCardDto,
  toProductDetailDto,
} from "./catalogue-core";

const publicProductSelect = {
  name: true,
  slug: true,
  description: true,
  active: true,
  published: true,
  category: {
    select: {
      name: true,
      slug: true,
      active: true,
    },
  },
  variants: {
    select: {
      id: true,
      name: true,
      size: true,
      color: true,
      priceCents: true,
      stockQuantity: true,
      active: true,
    },
    orderBy: [{ priceCents: "asc" as const }, { name: "asc" as const }],
  },
  images: {
    select: {
      url: true,
      altText: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: "asc" as const },
  },
};

const publishedWhere = {
  active: true,
  published: true,
  category: { active: true },
};

export type CategoryDto = {
  name: string;
  slug: string;
  description: string | null;
};

export type CategoryProductsDto = {
  category: CategoryDto;
  products: ProductCardDto[];
};

export const getActiveCategories = cache(async (): Promise<CategoryDto[]> => {
  return db.category.findMany({
    where: { active: true },
    select: { name: true, slug: true, description: true },
    orderBy: { name: "asc" },
  });
});

export const getPublishedProducts = cache(
  async (limit?: number): Promise<ProductCardDto[]> => {
    const products = await db.product.findMany({
      where: publishedWhere,
      select: publicProductSelect,
      orderBy: { name: "asc" },
      take: limit,
    });

    return products.map((product) =>
      toProductCardDto(product as CatalogueProductRecord),
    );
  },
);

export const getPublishedProductBySlug = cache(
  async (slug: string): Promise<ProductDetailDto | null> => {
    const product = await db.product.findFirst({
      where: { ...publishedWhere, slug },
      select: publicProductSelect,
    });

    return product
      ? toProductDetailDto(product as CatalogueProductRecord)
      : null;
  },
);

export const getPublishedProductsByCategory = cache(
  async (slug: string): Promise<CategoryProductsDto | null> => {
    const category = await db.category.findFirst({
      where: { slug, active: true },
      select: {
        name: true,
        slug: true,
        description: true,
        products: {
          where: { active: true, published: true },
          select: publicProductSelect,
          orderBy: { name: "asc" },
        },
      },
    });

    if (!category) return null;

    return {
      category: {
        name: category.name,
        slug: category.slug,
        description: category.description,
      },
      products: category.products.map((product) =>
        toProductCardDto(product as CatalogueProductRecord),
      ),
    };
  },
);
