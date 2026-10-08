import { describe, expect, it } from "vitest";

import {
  assertDevelopmentSeedAllowed,
  assertProductionProvisioningAllowed,
  assertSandboxReconciliationAllowed,
} from "./runtime-safety";

describe("operational script safety", () => {
  it("allows local development seeding but blocks production and unapproved remote targets", () => {
    expect(() => assertDevelopmentSeedAllowed({ connectionString: "postgresql://user:pass@localhost/app" })).not.toThrow();
    expect(() => assertDevelopmentSeedAllowed({ connectionString: "postgresql://user:pass@db.example/app" })).toThrow(/ALLOW_REMOTE_SEED/);
    expect(() => assertDevelopmentSeedAllowed({ connectionString: "postgresql://user:pass@db.example/app", allowRemoteSeed: "true" })).not.toThrow();
    expect(() => assertDevelopmentSeedAllowed({ connectionString: "postgresql://user:pass@localhost/app", nodeEnv: "production", allowRemoteSeed: "true" })).toThrow(/disabled in production/);
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
