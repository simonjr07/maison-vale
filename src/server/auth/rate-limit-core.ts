import { createHmac } from "node:crypto";

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_LOGIN_ATTEMPTS = 5;
export const MAX_LOGIN_SOURCE_ATTEMPTS = 25;
export const MAX_CHECKOUT_SOURCE_ATTEMPTS = 20;

export type RateLimitWindow = {
  keyHash: string;
  windowStart: Date;
  expiresAt: Date;
};

export function createRateLimitWindow(
  email: string,
  source: string,
  secret: string,
  now = new Date(),
): RateLimitWindow {
  if (!secret) {
    throw new Error("RATE_LIMIT_SECRET is not configured.");
  }

  const windowStartMs = Math.floor(now.getTime() / LOGIN_WINDOW_MS) * LOGIN_WINDOW_MS;
  const identity = `${email}\u0000${source.slice(0, 128)}`;

  return {
    keyHash: createHmac("sha256", secret).update(identity).digest("hex"),
    windowStart: new Date(windowStartMs),
    expiresAt: new Date(windowStartMs + LOGIN_WINDOW_MS),
  };
}

export function isLoginAttemptAllowed(attempts: number) {
  return attempts <= MAX_LOGIN_ATTEMPTS;
}

export function isRateLimitAllowed(attempts: number, maximum: number) {
  return Number.isSafeInteger(attempts) && attempts >= 0 && attempts <= maximum;
}

export async function consumeRateLimitSafely(
  increment: () => Promise<number>,
): Promise<boolean> {
  try {
    return isLoginAttemptAllowed(await increment());
  } catch {
    return false;
  }
}
