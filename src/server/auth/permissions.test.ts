import { describe, expect, it } from "vitest";

import { assertRole, AuthorizationError, hasRole } from "./permissions";

describe("role authorization", () => {
  it("allows administrators through admin-only enforcement", () => {
    expect(() => assertRole("ADMIN", ["ADMIN"])).not.toThrow();
  });

  it("rejects staff from admin-only enforcement", () => {
    expect(() => assertRole("STAFF", ["ADMIN"])).toThrow(AuthorizationError);
  });

  it("allows staff in explicitly shared operational areas", () => {
    expect(hasRole("STAFF", ["ADMIN", "STAFF"])).toBe(true);
  });
});
