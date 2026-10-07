import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies only the password used to create the bcrypt hash", async () => {
    const hash = await hashPassword("a sufficiently long password");

    await expect(verifyPassword("a sufficiently long password", hash)).resolves.toBe(true);
    await expect(verifyPassword("a different long password", hash)).resolves.toBe(false);
    expect(hash).not.toContain("a sufficiently long password");
  });
});
