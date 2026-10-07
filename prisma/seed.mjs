import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error("DATABASE_URL is not configured.");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const categories = [
  { name: "Soft Tailoring", slug: "soft-tailoring", description: "Relaxed structure, balanced proportions, and layers designed for an adaptable wardrobe." },
  { name: "Knitwear", slug: "knitwear", description: "Tactile merino and brushed fibres shaped into enduring, easy layers." },
  { name: "Leather Goods", slug: "leather-goods", description: "Quietly detailed accessories made to settle into daily use." },
  { name: "Everyday Objects", slug: "everyday-objects", description: "Considered pieces designed to bring quiet utility to daily rituals." },
];

const products = [
  {
    name: "Hearth Overshirt", slug: "hearth-overshirt", categorySlug: "soft-tailoring",
    description: "A softly structured overshirt in brushed cotton twill, finished with a clean collar and generous patch pockets. Cut to layer comfortably without losing its composed line.",
    image: "/catalogue/hearth-overshirt.svg", imageAlt: "Hearth Overshirt in warm clay cotton twill",
    variants: [
      { sku: "MV-HOS-CLY-S", name: "Clay / Small", size: "S", color: "Clay", priceCents: 22800, stockQuantity: 6 },
      { sku: "MV-HOS-CLY-M", name: "Clay / Medium", size: "M", color: "Clay", priceCents: 22800, stockQuantity: 0 },
      { sku: "MV-HOS-CLY-L", name: "Clay / Large", size: "L", color: "Clay", priceCents: 22800, stockQuantity: 4 },
    ],
  },
  {
    name: "Column Trouser", slug: "column-trouser", categorySlug: "soft-tailoring",
    description: "A full-length trouser with a relaxed straight leg, single front pleat, and a neat internal waistband. The mid-weight wool blend holds its shape while remaining easy to wear.",
    image: "/catalogue/column-trouser.svg", imageAlt: "Column Trouser in deep olive wool blend",
    variants: [
      { sku: "MV-COL-OLV-30", name: "Olive / 30", size: "30", color: "Olive", priceCents: 18400, stockQuantity: 3 },
      { sku: "MV-COL-OLV-32", name: "Olive / 32", size: "32", color: "Olive", priceCents: 18400, stockQuantity: 7 },
      { sku: "MV-COL-OLV-34", name: "Olive / 34", size: "34", color: "Olive", priceCents: 18400, stockQuantity: 2 },
    ],
  },
  {
    name: "Ridge Merino Crew", slug: "ridge-merino-crew", categorySlug: "knitwear",
    description: "A fine-gauge merino crew with a gently relaxed shoulder and compact ribbed trims. Warm enough to stand alone, light enough to sit beneath a coat.",
    image: "/catalogue/ridge-merino-crew.svg", imageAlt: "Ridge Merino Crew in a soft oat shade",
    variants: [
      { sku: "MV-RMC-OAT-M", name: "Oat / Medium", size: "M", color: "Oat", priceCents: 16800, stockQuantity: 5 },
      { sku: "MV-RMC-GRA-M", name: "Graphite / Medium", size: "M", color: "Graphite", priceCents: 17800, stockQuantity: 4 },
    ],
  },
  {
    name: "Vale Rib Cardigan", slug: "vale-rib-cardigan", categorySlug: "knitwear",
    description: "A substantial rib cardigan with a low V-neck and corozo buttons. Its compact knit gives the ease of a layer with the presence of a light jacket.",
    image: "/catalogue/vale-rib-cardigan.svg", imageAlt: "Vale Rib Cardigan in charcoal ribbed knit",
    variants: [
      { sku: "MV-VRC-CHR-XS", name: "Charcoal / Extra small", size: "XS", color: "Charcoal", priceCents: 19600, stockQuantity: 2 },
      { sku: "MV-VRC-CHR-S", name: "Charcoal / Small", size: "S", color: "Charcoal", priceCents: 19600, stockQuantity: 0 },
      { sku: "MV-VRC-CHR-M", name: "Charcoal / Medium", size: "M", color: "Charcoal", priceCents: 19600, stockQuantity: 1 },
      { sku: "MV-VRC-CHR-L-ARCH", name: "Charcoal / Large", size: "L", color: "Charcoal", priceCents: 19600, stockQuantity: 0, active: false },
    ],
  },
  {
    name: "Fold Cardholder", slug: "fold-cardholder", categorySlug: "leather-goods",
    description: "A compact folded cardholder cut from vegetable-tanned leather. Four card slots and a central pocket keep the profile slim and practical.",
    image: "/catalogue/fold-cardholder.svg", imageAlt: "Fold Cardholder in saddle-brown leather",
    variants: [
      { sku: "MV-FCH-SAD", name: "Saddle", color: "Saddle", priceCents: 8600, stockQuantity: 9 },
      { sku: "MV-FCH-BLK", name: "Black", color: "Black", priceCents: 8600, stockQuantity: 5 },
    ],
  },
  {
    name: "Linea Belt", slug: "linea-belt", categorySlug: "leather-goods",
    description: "A narrow full-grain leather belt with softly rounded edges and a brushed brass buckle. Designed as a quiet finishing line rather than a statement.",
    image: "/catalogue/linea-belt.svg", imageAlt: "Linea Belt in dark brown leather with a brass buckle",
    variants: [
      { sku: "MV-LIN-DBR-30", name: "Dark brown / 30", size: "30", color: "Dark brown", priceCents: 11200, stockQuantity: 0 },
      { sku: "MV-LIN-DBR-34", name: "Dark brown / 34", size: "34", color: "Dark brown", priceCents: 11200, stockQuantity: 0 },
    ],
  },
  {
    name: "Vale Carryall", slug: "vale-carryall", categorySlug: "everyday-objects",
    description: "A structured canvas carryall with understated proportions and practical capacity. Reinforced handles and an internal pocket support everyday journeys without adding bulk.",
    image: "/catalogue/vale-carryall.svg", imageAlt: "Vale Carryall in natural structured canvas",
    variants: [
      { sku: "MV-CARRY-NAT", name: "Natural", color: "Natural", priceCents: 14800, stockQuantity: 12 },
      { sku: "MV-CARRY-INK", name: "Ink", color: "Ink", priceCents: 14800, stockQuantity: 8 },
    ],
  },
  {
    name: "Studio Wool Throw", slug: "studio-wool-throw", categorySlug: "everyday-objects",
    description: "A softly brushed wool throw with a subtle woven border. Its generous scale and balanced weight bring warmth to a chair, sofa, or the foot of a bed.",
    image: "/catalogue/studio-wool-throw.svg", imageAlt: "Studio Wool Throw in rust and warm neutral tones",
    variants: [
      { sku: "MV-SWT-RUS", name: "Rust", color: "Rust", priceCents: 15400, stockQuantity: 4 },
      { sku: "MV-SWT-MOS", name: "Moss", color: "Moss", priceCents: 15400, stockQuantity: 6 },
    ],
  },
  {
    name: "Archive Sample Shirt", slug: "archive-sample-shirt", categorySlug: "soft-tailoring",
    description: "An internal unpublished catalogue fixture.", image: "/catalogue/hearth-overshirt.svg", imageAlt: "Archive sample shirt", published: false,
    variants: [{ sku: "MV-ARCH-SHIRT", name: "Sample", priceCents: 10000, stockQuantity: 1 }],
  },
  {
    name: "Retired Sample Object", slug: "retired-sample-object", categorySlug: "everyday-objects",
    description: "An internal inactive catalogue fixture.", image: "/catalogue/studio-wool-throw.svg", imageAlt: "Retired sample object", active: false,
    variants: [{ sku: "MV-RET-OBJECT", name: "Sample", priceCents: 10000, stockQuantity: 1 }],
  },
];

async function main() {
  await prisma.storeSettings.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: { storeName: "Maison Vale", currency: "USD" },
    create: { id: "00000000-0000-4000-8000-000000000001", storeName: "Maison Vale", currency: "USD" },
  });

  const categoryBySlug = new Map();

  for (const categoryData of categories) {
    const category = await prisma.category.upsert({
      where: { slug: categoryData.slug },
      update: { ...categoryData, active: true },
      create: { ...categoryData, active: true },
    });
    categoryBySlug.set(category.slug, category);
  }

  for (const productData of products) {
    const category = categoryBySlug.get(productData.categorySlug);
    if (!category) throw new Error(`Missing category ${productData.categorySlug}.`);

    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {
        name: productData.name, description: productData.description, categoryId: category.id,
        active: productData.active ?? true, published: productData.published ?? true,
      },
      create: {
        name: productData.name, slug: productData.slug, description: productData.description, categoryId: category.id,
        active: productData.active ?? true, published: productData.published ?? true,
      },
    });

    await prisma.productImage.upsert({
      where: { productId_sortOrder: { productId: product.id, sortOrder: 0 } },
      update: { url: productData.image, altText: productData.imageAlt },
      create: { productId: product.id, url: productData.image, altText: productData.imageAlt, sortOrder: 0 },
    });

    for (const variant of productData.variants) {
      await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        update: {
          productId: product.id, name: variant.name, size: variant.size ?? null, color: variant.color ?? null,
          priceCents: variant.priceCents, active: variant.active ?? true,
        },
        create: {
          productId: product.id, sku: variant.sku, name: variant.name, size: variant.size ?? null, color: variant.color ?? null,
          priceCents: variant.priceCents, stockQuantity: variant.stockQuantity, active: variant.active ?? true,
        },
      });
    }
  }

  console.log(`Development seed completed: ${categories.length} categories, ${products.length} products, and curated variants and images.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async () => {
    console.error("Development seed failed. Confirm that PostgreSQL is running and the database variables are valid.");
    await prisma.$disconnect();
    process.exit(1);
  });
