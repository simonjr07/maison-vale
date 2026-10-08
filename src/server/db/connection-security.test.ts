import { describe, expect, it } from "vitest";

import { assertSecureDatabaseConnection, getRuntimePoolOptions } from "./connection-security";

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
});
