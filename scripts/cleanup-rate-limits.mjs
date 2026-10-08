import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");

const apply = process.argv.includes("--apply");
const cutoff = new Date();
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  const expired = await prisma.loginRateLimitBucket.count({
    where: { expiresAt: { lte: cutoff } },
  });
  if (!apply) {
    console.log(`Rate-limit cleanup dry run: ${expired} expired buckets are eligible. Add --apply to remove them.`);
  } else {
    const result = await prisma.loginRateLimitBucket.deleteMany({
      where: { expiresAt: { lte: cutoff } },
    });
    console.log(`Rate-limit cleanup completed: ${result.count} expired buckets removed.`);
  }
} finally {
  await prisma.$disconnect();
}
