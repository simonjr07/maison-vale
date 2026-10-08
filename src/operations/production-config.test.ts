import { describe, expect, it } from "vitest";

import { checkProductionConfiguration } from "./production-config";

const validEnvironment = {
  APP_URL: "https://maison-vale.example",
  DATABASE_URL: "postgresql://runtime:secret@pool.example/app?sslmode=require",
  DIRECT_URL: "postgresql://migration:secret@db.example/app?sslmode=verify-full",
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
    expect(shared.blockers.join(" ")).toMatch(/separate endpoints and roles/);
  });

  it("requires Prisma pooler compatibility on Supabase transaction endpoints", () => {
    const report = checkProductionConfiguration({
      ...validEnvironment,
      DATABASE_URL: "postgresql://runtime:secret@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require",
    });
    expect(report.blockers.join(" ")).toMatch(/pgbouncer=true/);
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
