import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error("DATABASE_URL is not configured.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function verify(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const visibleProducts = await prisma.product.findMany({
    where: { active: true, published: true, category: { active: true } },
    select: {
      slug: true,
      category: { select: { active: true } },
      variants: { select: { active: true, stockQuantity: true } },
      images: { select: { url: true, altText: true, sortOrder: true } },
    },
  });

  const activeCategories = await prisma.category.count({ where: { active: true } });
  const hiddenFixtures = await prisma.product.count({
    where: {
      slug: { in: ["archive-sample-shirt", "retired-sample-object"] },
      OR: [{ active: false }, { published: false }],
    },
  });

  verify(activeCategories >= 3 && activeCategories <= 5, "Expected three to five active categories.");
  verify(visibleProducts.length >= 6 && visibleProducts.length <= 10, "Expected six to ten public products.");
  verify(hiddenFixtures === 2, "Expected inactive and unpublished visibility fixtures.");
  verify(visibleProducts.every((product) => product.category.active), "A visible product belongs to an inactive category.");
  verify(visibleProducts.every((product) => product.variants.length > 0), "A visible product has no variants.");
  verify(visibleProducts.every((product) => product.images.length > 0), "A visible product has no image.");
  verify(visibleProducts.every((product) => product.images.length >= 2), "A visible product is missing its gallery image.");
  verify(
    visibleProducts.every((product) => product.images.every((image) => image.url && image.altText && image.sortOrder >= 0)),
    "A public product image is incomplete.",
  );
  verify(
    visibleProducts.every((product) => product.images.every((image) => image.url.startsWith("/catalogue/photography/") && image.url.endsWith(".webp"))),
    "A public product is not using an optimized curated photograph.",
  );
  verify(
    visibleProducts.some((product) => product.variants.some((variant) => variant.active && variant.stockQuantity === 0)),
    "Expected an out-of-stock active variant fixture.",
  );
  verify(
    visibleProducts.some((product) => product.variants.some((variant) => !variant.active)),
    "Expected an unavailable variant fixture.",
  );

  console.log(`Catalogue integration verification passed for ${activeCategories} categories and ${visibleProducts.length} public products.`);
} finally {
  await prisma.$disconnect();
}
