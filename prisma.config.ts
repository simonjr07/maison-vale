import "dotenv/config";

import { defineConfig } from "prisma/config";

// Client generation does not access PostgreSQL. The unreachable fallback lets clean
// deployment installs generate the ignored client without exposing migration credentials.
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
