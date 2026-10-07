import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.storeSettings.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: { storeName: "Maison Vale", currency: "USD" },
    create: { id: "00000000-0000-4000-8000-000000000001", storeName: "Maison Vale", currency: "USD" },
  });

  const category = await prisma.category.upsert({
    where: { slug: "everyday-objects" },
    update: {
      name: "Everyday Objects",
      description: "Considered pieces designed to bring quiet utility to daily rituals.",
      active: true,
    },
    create: {
      name: "Everyday Objects",
      slug: "everyday-objects",
      description: "Considered pieces designed to bring quiet utility to daily rituals.",
    },
  });

  const product = await prisma.product.upsert({
    where: { slug: "vale-carryall" },
    update: {
      name: "Vale Carryall",
      description: "A structured canvas carryall with understated proportions and practical capacity.",
      categoryId: category.id,
      active: true,
      published: false,
    },
    create: {
      name: "Vale Carryall",
      slug: "vale-carryall",
      description: "A structured canvas carryall with understated proportions and practical capacity.",
      categoryId: category.id,
      active: true,
      published: false,
    },
  });

  await Promise.all([
    prisma.productVariant.upsert({
      where: { sku: "MV-CARRY-NAT" },
      update: { productId: product.id, name: "Natural", color: "Natural", priceCents: 14800, stockQuantity: 12, active: true },
      create: { productId: product.id, sku: "MV-CARRY-NAT", name: "Natural", color: "Natural", priceCents: 14800, stockQuantity: 12 },
    }),
    prisma.productVariant.upsert({
      where: { sku: "MV-CARRY-INK" },
      update: { productId: product.id, name: "Ink", color: "Ink", priceCents: 14800, stockQuantity: 8, active: true },
      create: { productId: product.id, sku: "MV-CARRY-INK", name: "Ink", color: "Ink", priceCents: 14800, stockQuantity: 8 },
    }),
  ]);

  console.log("Development seed completed: 1 store setting, 1 category, 1 product, and 2 variants.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async () => {
    console.error("Development seed failed. Confirm that PostgreSQL is running and the database variables are valid.");
    await prisma.$disconnect();
    process.exit(1);
  });
