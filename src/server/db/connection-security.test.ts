import { describe, expect, it } from "vitest";

import {
  assertSecureDatabaseConnection,
  getRuntimePoolOptions,
  isNeonDatabaseHost,
  isNeonPooledHost,
} from "./connection-security";

describe("database connection security", () => {
  it("allows local PostgreSQL without TLS for development and local production builds", () => {
    expect(() => assertSecureDatabaseConnection("postgresql://user:pass@localhost:5435/app", { NODE_ENV: "production" })).not.toThrow();
  });

  it("requires TLS for hosted production PostgreSQL", () => {
    expect(() => assertSecureDatabaseConnection("postgresql://user:pass@db.example/app", { NODE_ENV: "production" })).toThrow(/requires TLS/);
    expect(() => assertSecureDatabaseConnection("postgresql://user:pass@db.example/app?sslmode=require", { NODE_ENV: "production" })).not.toThrow();
  });

  it("rejects non-PostgreSQL connection strings", () => {
    expect(() => assertSecureDatabaseConnection("mysql://user:pass@db.example/app", { NODE_ENV: "production" })).toThrow(/PostgreSQL/);
  });

  it("keeps each production function pool deliberately small", () => {
    expect(getRuntimePoolOptions(
      "postgresql://user:pass@db.example/app?sslmode=require",
      { NODE_ENV: "production" },
    )).toMatchObject({ max: 1, connectionTimeoutMillis: 10_000 });
  });

  it("recognizes Neon pooled and direct hostnames", () => {
    expect(isNeonDatabaseHost("ep-example.eu-west-2.aws.neon.tech")).toBe(true);
    expect(isNeonPooledHost("ep-example-pooler.eu-west-2.aws.neon.tech")).toBe(true);
    expect(isNeonPooledHost("ep-example.eu-west-2.aws.neon.tech")).toBe(false);
  });

  it("honors Neon's channel binding parameter without changing the connection string", () => {
    const connectionString = "postgresql://user:pass@ep-example-pooler.eu-west-2.aws.neon.tech/app?sslmode=require&channel_binding=require";
    expect(getRuntimePoolOptions(connectionString, { NODE_ENV: "production" })).toMatchObject({
      connectionString,
      enableChannelBinding: true,
      max: 1,
    });
  });
});
