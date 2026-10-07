import { describe, expect, it } from "vitest";

import {
  consumeRateLimitSafely,
  createRateLimitWindow,
  isLoginAttemptAllowed,
  LOGIN_WINDOW_MS,
  MAX_LOGIN_ATTEMPTS,
} from "./rate-limit-core";

describe("login rate limiting", () => {
  it("creates a stable secret-backed identifier without retaining the email", () => {
    const now = new Date("2026-10-07T12:07:00.000Z");
    const first = createRateLimitWindow("admin@example.com", "127.0.0.1", "test-secret", now);
    const second = createRateLimitWindow("admin@example.com", "127.0.0.1", "test-secret", now);

    expect(first.keyHash).toBe(second.keyHash);
    expect(first.keyHash).toHaveLength(64);
    expect(first.keyHash).not.toContain("admin@example.com");
    expect(first.expiresAt.getTime() - first.windowStart.getTime()).toBe(LOGIN_WINDOW_MS);
  });

  it("allows only the configured number of attempts per window", () => {
    expect(isLoginAttemptAllowed(MAX_LOGIN_ATTEMPTS)).toBe(true);
    expect(isLoginAttemptAllowed(MAX_LOGIN_ATTEMPTS + 1)).toBe(false);
  });

  it("fails closed when rate-limit persistence fails", async () => {
    await expect(
      consumeRateLimitSafely(async () => {
        throw new Error("database unavailable");
      }),
    ).resolves.toBe(false);
  });
});
