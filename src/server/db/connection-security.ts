export function isLocalDatabaseHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isNeonDatabaseHost(hostname: string) {
  return hostname.toLowerCase().endsWith(".neon.tech");
}

export function isNeonPooledHost(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();
  return isNeonDatabaseHost(normalizedHostname)
    && normalizedHostname.split(".", 1)[0].endsWith("-pooler");
}

export function assertSecureDatabaseConnection(
  connectionString: string,
  environment: { NODE_ENV?: string } = process.env,
) {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL is invalid.");
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error("DATABASE_URL must use PostgreSQL.");
  }

  if (environment.NODE_ENV !== "production" || isLocalDatabaseHost(url.hostname)) return;
  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
  if (!sslMode || !["require", "verify-ca", "verify-full"].includes(sslMode)) {
    throw new Error("Hosted production PostgreSQL requires TLS through sslmode.");
  }
}

export function getRuntimePoolOptions(
  connectionString: string,
  environment: { NODE_ENV?: string } = process.env,
) {
  assertSecureDatabaseConnection(connectionString, environment);
  const url = new URL(connectionString);

  return {
    connectionString,
    max: environment.NODE_ENV === "production" ? 1 : 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    enableChannelBinding: url.searchParams.get("channel_binding")?.toLowerCase() === "require",
  };
}
