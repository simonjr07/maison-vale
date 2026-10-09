import { describe, expect, it } from "vitest";

import {
  assertDevelopmentSeedAllowed,
  assertPublicCatalogueBootstrapAllowed,
  assertProductionProvisioningAllowed,
  assertSandboxReconciliationAllowed,
} from "./runtime-safety";

describe("operational script safety", () => {
  it("allows local development seeding but always blocks remote and production targets", () => {
    expect(() => assertDevelopmentSeedAllowed({ connectionString: "postgresql://user:pass@localhost/app" })).not.toThrow();
    expect(() => assertDevelopmentSeedAllowed({ connectionString: "postgresql://user:pass@db.example/app" })).toThrow(/restricted to local/);
    expect(() => assertDevelopmentSeedAllowed({ connectionString: "postgresql://user:pass@db.example/app", allowRemoteSeed: "true" })).toThrow(/restricted to local/);
    expect(() => assertDevelopmentSeedAllowed({ connectionString: "postgresql://user:pass@localhost/app", nodeEnv: "production", allowRemoteSeed: "true" })).toThrow(/disabled in production/);
  });

  it("requires the explicit private environment and matching Neon pooled and direct targets", () => {
    const valid = {
      databaseUrl: "postgresql://runtime:secret@ep-example-pooler.us-east-2.aws.neon.tech/maison?sslmode=require",
      directUrl: "postgresql://owner:secret@ep-example.us-east-2.aws.neon.tech/maison?sslmode=require",
      allowRemoteSeed: "true",
      dotenvConfigPath: ".env.neon.local",
      workingDirectory: process.cwd(),
    };
    expect(() => assertPublicCatalogueBootstrapAllowed(valid)).not.toThrow();
    expect(() => assertPublicCatalogueBootstrapAllowed({ ...valid, allowRemoteSeed: undefined })).toThrow(/ALLOW_REMOTE_SEED/);
    expect(() => assertPublicCatalogueBootstrapAllowed({ ...valid, dotenvConfigPath: ".env" })).toThrow(/\.env\.neon\.local/);
    expect(() => assertPublicCatalogueBootstrapAllowed({ ...valid, databaseUrl: "postgresql://user:pass@localhost/maison" })).toThrow(/invalid/);
    expect(() => assertPublicCatalogueBootstrapAllowed({ ...valid, directUrl: "postgresql://owner:secret@ep-other.us-east-2.aws.neon.tech/maison?sslmode=require" })).toThrow(/same Neon endpoint/);
    expect(() => assertPublicCatalogueBootstrapAllowed({ ...valid, vercel: "1" })).toThrow(/deployed web environment/);
  });

  it("requires a separate explicit reconciliation gate and always rejects production", () => {
    expect(() => assertSandboxReconciliationAllowed({})).toThrow(/ALLOW_SANDBOX_RECONCILIATION/);
    expect(() => assertSandboxReconciliationAllowed({ enabled: "true" })).not.toThrow();
    expect(() => assertSandboxReconciliationAllowed({ nodeEnv: "production", enabled: "true" })).toThrow(/disabled in production/);
  });

  it("requires explicit production administrator provisioning", () => {
    expect(() => assertProductionProvisioningAllowed({ nodeEnv: "production" })).toThrow(/ALLOW_PRODUCTION_ADMIN_PROVISIONING/);
    expect(() => assertProductionProvisioningAllowed({ nodeEnv: "production", enabled: "true" })).not.toThrow();
  });
});
