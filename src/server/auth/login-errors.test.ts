import { describe, expect, it } from "vitest";

import { GENERIC_LOGIN_ERROR, getPublicLoginError } from "./login-errors";

describe("public login errors", () => {
  it("uses one generic message for authentication failures", () => {
    expect(getPublicLoginError()).toBe(GENERIC_LOGIN_ERROR);
    expect(GENERIC_LOGIN_ERROR).not.toMatch(/inactive|password|user exists|rate limit/i);
  });
});
