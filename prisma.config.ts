import "dotenv/config";

import { defineConfig } from "prisma/config";

// Prisma 7 CLI commands use datasource.url. Client generation does not access PostgreSQL,
// so the unreachable fallback lets clean deployment installs generate the ignored client
// without putting the Neon migration credential in the Vercel web runtime. Any command
// that does access the database fails closed unless DIRECT_URL is explicitly supplied.
const migrationUrl = process.env.DIRECT_URL
  ?? "postgresql://prisma-generate:prisma-generate@127.0.0.1:1/prisma-generate";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --experimental-strip-types prisma/seed.mjs",
  },
  datasource: {
    url: migrationUrl,
  },
});
