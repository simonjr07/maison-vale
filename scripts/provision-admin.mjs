import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { assertProductionProvisioningAllowed } from "../src/operations/runtime-safety.ts";
import { hashPassword } from "../src/server/auth/password.ts";
import { adminProvisionSchema } from "../src/server/auth/validation.ts";

const parsed = adminProvisionSchema.safeParse({
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
});

assertProductionProvisioningAllowed({
  nodeEnv: process.env.NODE_ENV,
  enabled: process.env.ALLOW_PRODUCTION_ADMIN_PROVISIONING,
});

if (!parsed.success) {
  console.error("Provisioning failed. Set a valid ADMIN_EMAIL and an ADMIN_PASSWORD of 12 to 128 characters.");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Provisioning failed. DATABASE_URL is not configured.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hashPassword(parsed.data.password);
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  await prisma.user.upsert({
    where: { email: parsed.data.email },
    update: { passwordHash, role: "ADMIN", active: true },
    create: {
      email: parsed.data.email,
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  console.log(existing ? "Administrator account updated and activated." : "Administrator account created and activated.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async () => {
    console.error("Provisioning failed. Confirm that PostgreSQL is running and the database variables are valid.");
    await prisma.$disconnect();
    process.exit(1);
  });
