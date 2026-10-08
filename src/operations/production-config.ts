import { assertSecureDatabaseConnection } from "../server/db/connection-security.ts";

type ProductionEnvironment = Record<string, string | undefined>;

export type ProductionConfigurationReport = {
  blockers: string[];
  warnings: string[];
};

function hasStrongSecret(value: string | undefined) {
  return Boolean(value && value.trim().length >= 32);
}

export function checkProductionConfiguration(
  environment: ProductionEnvironment,
  options: { requireStripe?: boolean; requireDirectUrl?: boolean; migrationOnly?: boolean } = {},
): ProductionConfigurationReport {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const appUrl = environment.APP_URL?.trim();

  if (!options.migrationOnly) {
    try {
      const parsed = new URL(appUrl ?? "");
      if (
        parsed.protocol !== "https:" ||
        parsed.pathname !== "/" ||
        parsed.search ||
        parsed.hash ||
        parsed.username ||
        parsed.password
      ) {
        blockers.push("APP_URL must be the canonical HTTPS origin without a path, credentials, query, or fragment.");
      }
    } catch {
      blockers.push("APP_URL must be configured as the canonical HTTPS origin.");
    }
  }

  const databaseNames = options.requireDirectUrl || environment.DIRECT_URL
    ? (["DATABASE_URL", "DIRECT_URL"] as const)
    : (["DATABASE_URL"] as const);
  for (const name of databaseNames) {
    const value = environment[name];
    if (!value) {
      blockers.push(`${name} is required.`);
      continue;
    }
    try {
      assertSecureDatabaseConnection(value, { NODE_ENV: "production" });
    } catch {
      blockers.push(`${name} must be a valid TLS-protected PostgreSQL connection string.`);
    }
  }
  if (
    options.requireDirectUrl &&
    environment.DATABASE_URL &&
    environment.DIRECT_URL &&
    environment.DATABASE_URL === environment.DIRECT_URL
  ) {
    blockers.push("Runtime and migration database connections must use separate endpoints and roles.");
  }
  if (environment.DATABASE_URL) {
    try {
      const runtimeUrl = new URL(environment.DATABASE_URL);
      if (
        runtimeUrl.hostname.endsWith(".pooler.supabase.com") &&
        runtimeUrl.port === "6543" &&
        runtimeUrl.searchParams.get("pgbouncer") !== "true"
      ) {
        blockers.push("Supabase transaction-pooler DATABASE_URL must include pgbouncer=true.");
      }
    } catch {
      // The general database validation above reports malformed values.
    }
  }

  if (options.migrationOnly) return { blockers, warnings };

  const secrets = ["AUTH_SECRET", "RATE_LIMIT_SECRET", "ORDER_LOOKUP_SECRET"] as const;
  for (const name of secrets) {
    if (!hasStrongSecret(environment[name])) blockers.push(`${name} must contain at least 32 characters.`);
  }
  const configuredSecrets = secrets.map((name) => environment[name]?.trim()).filter(Boolean);
  if (new Set(configuredSecrets).size !== configuredSecrets.length) {
    blockers.push("Authentication, rate-limit, and order-lookup secrets must be independent values.");
  }

  const stripeKey = environment.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = environment.STRIPE_WEBHOOK_SECRET?.trim();
  const publishableKey = environment.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (options.requireStripe && (!stripeKey || !webhookSecret)) {
    blockers.push("Stripe sandbox checkout requires both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.");
  }
  if (stripeKey && !stripeKey.startsWith("sk_test_")) {
    blockers.push("STRIPE_SECRET_KEY must be a Stripe test-mode key.");
  }
  if (webhookSecret && !webhookSecret.startsWith("whsec_")) {
    blockers.push("STRIPE_WEBHOOK_SECRET must be a hosted endpoint signing secret.");
  }
  if (publishableKey && !publishableKey.startsWith("pk_test_")) {
    blockers.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, when used, must be test mode.");
  }
  if (!stripeKey && !webhookSecret) {
    warnings.push("Stripe sandbox checkout is disabled; catalogue and non-payment routes remain available.");
  }

  for (const name of [
    "ALLOW_REMOTE_SEED",
    "ALLOW_SANDBOX_RECONCILIATION",
    "ALLOW_PRODUCTION_ADMIN_PROVISIONING",
  ]) {
    if (environment[name] === "true") blockers.push(`${name} must not remain enabled during normal production runtime.`);
  }
  if (environment.ADMIN_EMAIL || environment.ADMIN_PASSWORD) {
    blockers.push("ADMIN_EMAIL and ADMIN_PASSWORD must be removed after one-off provisioning.");
  }
  if (environment.TRUST_PROXY_HEADERS === "true" && environment.VERCEL === "1") {
    warnings.push("TRUST_PROXY_HEADERS is unnecessary on Vercel; the protected Vercel forwarding header is used.");
  }

  return { blockers, warnings };
}
