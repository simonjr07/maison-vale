import { resolve } from "node:path";

import { isLocalDatabaseHost } from "../server/db/connection-security.ts";
import { checkProductionConfiguration } from "./production-config.ts";

export function assertDevelopmentSeedAllowed(input: {
  connectionString: string;
  nodeEnv?: string;
  allowRemoteSeed?: string;
}) {
  if (input.nodeEnv === "production") {
    throw new Error("The development seed is disabled in production.");
  }

  let hostname: string;
  try {
    hostname = new URL(input.connectionString).hostname;
  } catch {
    throw new Error("DATABASE_URL is invalid.");
  }

  if (!isLocalDatabaseHost(hostname)) {
    throw new Error("The development seed is restricted to local PostgreSQL. Use the guarded public catalogue bootstrap for Neon.");
  }
}

export function assertPublicCatalogueBootstrapAllowed(input: {
  databaseUrl?: string;
  directUrl?: string;
  allowRemoteSeed?: string;
  dotenvConfigPath?: string;
  workingDirectory: string;
  vercel?: string;
}) {
  if (input.allowRemoteSeed !== "true") {
    throw new Error("The public catalogue bootstrap requires ALLOW_REMOTE_SEED=true.");
  }
  if (input.vercel === "1") {
    throw new Error("The public catalogue bootstrap cannot run in the deployed web environment.");
  }

  const expectedEnvironmentPath = resolve(input.workingDirectory, ".env.neon.local");
  const actualEnvironmentPath = input.dotenvConfigPath
    ? resolve(input.workingDirectory, input.dotenvConfigPath)
    : undefined;
  if (!actualEnvironmentPath || actualEnvironmentPath !== expectedEnvironmentPath) {
    throw new Error("The public catalogue bootstrap must load the private .env.neon.local file explicitly.");
  }

  const report = checkProductionConfiguration(
    { DATABASE_URL: input.databaseUrl, DIRECT_URL: input.directUrl },
    { requireDirectUrl: true, migrationOnly: true },
  );
  if (report.blockers.length > 0) {
    throw new Error(`The public catalogue bootstrap target is invalid: ${report.blockers.join(" ")}`);
  }
}

export function assertSandboxReconciliationAllowed(input: {
  nodeEnv?: string;
  enabled?: string;
}) {
  if (input.nodeEnv === "production") {
    throw new Error("Sandbox reconciliation is disabled in production.");
  }
  if (input.enabled !== "true") {
    throw new Error("Sandbox reconciliation requires ALLOW_SANDBOX_RECONCILIATION=true.");
  }
}

export function assertProductionProvisioningAllowed(input: {
  nodeEnv?: string;
  enabled?: string;
}) {
  if (input.nodeEnv === "production" && input.enabled !== "true") {
    throw new Error("Production administrator provisioning requires ALLOW_PRODUCTION_ADMIN_PROVISIONING=true.");
  }
}
