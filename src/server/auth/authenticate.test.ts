import { beforeAll, describe, expect, it, vi } from "vitest";

import { authenticateCredentials, type AuthenticationDependencies } from "./authenticate";
import { hashPassword, verifyPassword } from "./password";

const password = "correct horse battery staple";
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword(password);
});

function dependencies(
  user: Awaited<ReturnType<AuthenticationDependencies["findUserByEmail"]>>,
  attemptAllowed = true,
): AuthenticationDependencies {
  return {
    consumeAttempt: vi.fn().mockResolvedValue(attemptAllowed),
    findUserByEmail: vi.fn().mockResolvedValue(user),
    verifyPassword,
  };
}

describe("credential authentication", () => {
  it("accepts an active administrator with the correct password", async () => {
    const identity = await authenticateCredentials(
      { email: "ADMIN@example.com", password },
      "127.0.0.1",
      dependencies({ id: "admin-id", role: "ADMIN", active: true, passwordHash }),
    );

    expect(identity).toEqual({ id: "admin-id", role: "ADMIN" });
  });

  it("returns the same null result for a wrong password", async () => {
    const identity = await authenticateCredentials(
      { email: "admin@example.com", password: "a valid but incorrect password" },
      "127.0.0.1",
      dependencies({ id: "admin-id", role: "ADMIN", active: true, passwordHash }),
    );

    expect(identity).toBeNull();
  });

  it("rejects inactive users even when the password is correct", async () => {
    const identity = await authenticateCredentials(
      { email: "staff@example.com", password },
      "127.0.0.1",
      dependencies({ id: "staff-id", role: "STAFF", active: false, passwordHash }),
    );

    expect(identity).toBeNull();
  });

  it("rejects attempts denied by the rate limiter before user lookup", async () => {
    const deps = dependencies(null, false);
    const identity = await authenticateCredentials(
      { email: "staff@example.com", password },
      "127.0.0.1",
      deps,
    );

    expect(identity).toBeNull();
    expect(deps.findUserByEmail).not.toHaveBeenCalled();
  });

  it("does not query users for structurally invalid credentials", async () => {
    const deps = dependencies(null);
    const identity = await authenticateCredentials(
      { email: "invalid", password: "short" },
      "127.0.0.1",
      deps,
    );

    expect(identity).toBeNull();
    expect(deps.consumeAttempt).not.toHaveBeenCalled();
    expect(deps.findUserByEmail).not.toHaveBeenCalled();
  });
});
