import "server-only";

import { db } from "@/server/db/client";
import {
  MAX_CHECKOUT_SOURCE_ATTEMPTS,
  MAX_LOGIN_ATTEMPTS,
  consumeRateLimitSafely,
  createRateLimitWindow,
  isRateLimitAllowed,
} from "@/server/auth/rate-limit-core";

export async function consumeCheckoutAttempt(email: string, source: string) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret) return false;

  const windows = [
    { ...createRateLimitWindow(`checkout:${email}`, source, secret), maximum: MAX_LOGIN_ATTEMPTS },
    { ...createRateLimitWindow("checkout-source", source, secret), maximum: MAX_CHECKOUT_SOURCE_ATTEMPTS },
  ];
  return consumeRateLimitSafely(async () => {
    const buckets = await db.$transaction(windows.map((window) =>
      db.loginRateLimitBucket.upsert({
        where: {
          keyHash_windowStart: {
            keyHash: window.keyHash,
            windowStart: window.windowStart,
          },
        },
        update: { attempts: { increment: 1 } },
        create: {
          keyHash: window.keyHash,
          windowStart: window.windowStart,
          expiresAt: window.expiresAt,
          attempts: 1,
        },
        select: { attempts: true },
      }),
    ));
    return buckets.every((bucket, index) =>
      isRateLimitAllowed(bucket.attempts, windows[index].maximum),
    ) ? 1 : Number.MAX_SAFE_INTEGER;
  });
}

