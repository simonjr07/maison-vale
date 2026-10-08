import "dotenv/config";

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { checkProductionConfiguration } from "../src/operations/production-config.ts";

const command = process.argv[2];

if (!new Set(["status", "deploy"]).has(command)) {
  console.error("Usage: run-production-migrations.mjs <status|deploy>");
  process.exit(1);
}

const report = checkProductionConfiguration(process.env, {
  requireDirectUrl: true,
  migrationOnly: true,
});

for (const warning of report.warnings) console.warn(`Configuration warning: ${warning}`);
if (report.blockers.length > 0) {
  for (const blocker of report.blockers) console.error(`Configuration blocker: ${blocker}`);
  process.exit(1);
}

console.log(`Production migration configuration passed; running Prisma migrate ${command}.`);

const result = spawnSync(
  process.execPath,
  [resolve("node_modules/prisma/build/index.js"), "migrate", command],
  { env: process.env, stdio: "inherit" },
);

if (result.error) {
  console.error("Prisma migration command could not be started.");
  process.exit(1);
}

process.exit(result.status ?? 1);
