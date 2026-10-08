import { isLocalDatabaseHost } from "../server/db/connection-security.ts";

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

  if (!isLocalDatabaseHost(hostname) && input.allowRemoteSeed !== "true") {
    throw new Error("Remote seeding requires the explicit ALLOW_REMOTE_SEED=true operator gate.");
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
