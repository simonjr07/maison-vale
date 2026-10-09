import { describe, expect, it } from "vitest";

import { checkProductionConfiguration } from "./production-config";

const validEnvironment = {
  APP_URL: "https://maison-vale.example",
  DATABASE_URL: "postgresql://runtime:secret@ep-maison-vale-pooler.eu-west-2.aws.neon.tech/app?sslmode=require&channel_binding=require",
  DIRECT_URL: "postgresql://migration:secret@ep-maison-vale.eu-west-2.aws.neon.tech/app?sslmode=require&channel_binding=require",
  AUTH_SECRET: "a".repeat(32),
  RATE_LIMIT_SECRET: "b".repeat(32),
  ORDER_LOOKUP_SECRET: "c".repeat(32),
  STRIPE_SECRET_KEY: "sk_test_example",
  STRIPE_WEBHOOK_SECRET: "whsec_example",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
};

describe("production configuration", () => {
  it("accepts an isolated HTTPS, TLS, sandbox-only configuration", () => {
    expect(checkProductionConfiguration(validEnvironment, { requireStripe: true, requireDirectUrl: true })).toEqual({ blockers: [], warnings: [] });
  });

  it("does not require migration credentials in the hosted web runtime", () => {
    expect(checkProductionConfiguration({ ...validEnvironment, DIRECT_URL: undefined }, { requireStripe: true })).toEqual({ blockers: [], warnings: [] });
  });

  it("requires distinct direct credentials in a migration environment", () => {
    const missing = checkProductionConfiguration(
      { ...validEnvironment, DIRECT_URL: undefined },
      { requireDirectUrl: true, migrationOnly: true },
    );
    expect(missing.blockers.join(" ")).toMatch(/DIRECT_URL is required/);

    const shared = checkProductionConfiguration(
      { ...validEnvironment, DIRECT_URL: validEnvironment.DATABASE_URL },
      { requireDirectUrl: true, migrationOnly: true },
    );
    expect(shared.blockers.join(" ")).toMatch(/distinct pooled and direct endpoints/);
  });

  it("requires a Neon pooler for runtime without adding Supabase parameters", () => {
    const report = checkProductionConfiguration({
      ...validEnvironment,
      DATABASE_URL: "postgresql://runtime:secret@ep-maison-vale.eu-west-2.aws.neon.tech/app?sslmode=require",
    });
    expect(report.blockers.join(" ")).toMatch(/hostname ends in -pooler/);

    const pooled = checkProductionConfiguration({
      ...validEnvironment,
      DATABASE_URL: "postgresql://runtime:secret@ep-maison-vale-pooler.eu-west-2.aws.neon.tech/app?sslmode=require",
      DIRECT_URL: undefined,
    });
    expect(pooled.blockers).toEqual([]);
  });

  it("requires the unpooled Neon endpoint for controlled migrations", () => {
    const report = checkProductionConfiguration(
      { ...validEnvironment, DIRECT_URL: validEnvironment.DATABASE_URL },
      { requireDirectUrl: true, migrationOnly: true },
    );
    expect(report.blockers.join(" ")).toMatch(/unpooled endpoint/);
  });

  it("requires runtime and migration URLs to target the same Neon database", () => {
    const report = checkProductionConfiguration(
      {
        ...validEnvironment,
        DIRECT_URL: "postgresql://migration:secret@ep-other.eu-west-2.aws.neon.tech/other?sslmode=require",
      },
      { requireDirectUrl: true, migrationOnly: true },
    );
    expect(report.blockers.join(" ")).toMatch(/same Neon endpoint and database/);
  });

  it("rejects a different hosted PostgreSQL provider for this Neon release", () => {
    const report = checkProductionConfiguration({
      ...validEnvironment,
      DATABASE_URL: "postgresql://runtime:secret@pool.example.com/app?sslmode=require",
      DIRECT_URL: undefined,
    });
    expect(report.blockers.join(" ")).toMatch(/intended Neon PostgreSQL project/);
  });

  it("rejects local database targets in production checks", () => {
    const report = checkProductionConfiguration(
      {
        ...validEnvironment,
        DATABASE_URL: "postgresql://runtime:secret@localhost:5435/app",
        DIRECT_URL: "postgresql://migration:secret@127.0.0.1:5435/app",
      },
      { requireDirectUrl: true, migrationOnly: true },
    );
    expect(report.blockers.join(" ")).toMatch(/hosted PostgreSQL/);
  });

  it("rejects live Stripe keys, weak shared secrets, and unsafe operator gates", () => {
    const report = checkProductionConfiguration({
      ...validEnvironment,
      AUTH_SECRET: "shared-secret-that-is-at-least-32-characters",
      RATE_LIMIT_SECRET: "shared-secret-that-is-at-least-32-characters",
      STRIPE_SECRET_KEY: "sk_live_never-allowed",
      ALLOW_SANDBOX_RECONCILIATION: "true",
    }, { requireStripe: true });
    expect(report.blockers.join(" ")).toMatch(/independent/);
    expect(report.blockers.join(" ")).toMatch(/test-mode/);
    expect(report.blockers.join(" ")).toMatch(/must not remain enabled/);
  });

  it("allows Stripe to be omitted while warning that payments are disabled", () => {
    const report = checkProductionConfiguration({
      ...validEnvironment,
      STRIPE_SECRET_KEY: undefined,
      STRIPE_WEBHOOK_SECRET: undefined,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: undefined,
    });
    expect(report.blockers).toEqual([]);
    expect(report.warnings).toHaveLength(1);
  });
});
