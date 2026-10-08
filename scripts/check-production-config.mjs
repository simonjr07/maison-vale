import "dotenv/config";

import { checkProductionConfiguration } from "../src/operations/production-config.ts";

const report = checkProductionConfiguration(process.env, {
  requireStripe: process.argv.includes("--require-stripe"),
  requireDirectUrl: process.argv.includes("--require-direct-url"),
  migrationOnly: process.argv.includes("--migration-only"),
});

for (const warning of report.warnings) console.warn(`Configuration warning: ${warning}`);
if (report.blockers.length > 0) {
  for (const blocker of report.blockers) console.error(`Configuration blocker: ${blocker}`);
  process.exit(1);
}

console.log("Production configuration checks passed without printing secret values.");
