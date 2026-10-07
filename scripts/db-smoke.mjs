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
  const [settings, categories, products, variants, inventoryMovements] = await Promise.all([
    prisma.storeSettings.count(),
    prisma.category.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.inventoryMovement.count(),
  ]);

  console.log(`Database connection verified. Rows: settings=${settings}, categories=${categories}, products=${products}, variants=${variants}, inventoryMovements=${inventoryMovements}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async () => {
    console.error("Database smoke test failed. Confirm that PostgreSQL is running and the database variables are valid.");
    await prisma.$disconnect();
    process.exit(1);
  });
