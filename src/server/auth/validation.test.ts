import { describe, expect, it } from "vitest";

import { loginCredentialsSchema, normalizeEmail } from "./validation";

describe("login credential validation", () => {
  it("normalizes valid email addresses", () => {
    const result = loginCredentialsSchema.parse({
      email: "  Staff@MaisonVale.test ",
      password: "a secure local password",
    });

    expect(result.email).toBe("staff@maisonvale.test");
  });

  it("rejects malformed credentials", () => {
    expect(
      loginCredentialsSchema.safeParse({ email: "not-an-email", password: "short" }).success,
    ).toBe(false);
  });

  it("normalizes provisioning lookups consistently", () => {
    expect(normalizeEmail(" ADMIN@Example.COM ")).toBe("admin@example.com");
  });
});
