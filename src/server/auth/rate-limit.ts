import "server-only";

import { db } from "@/server/db/client";

import { consumeRateLimitSafely, createRateLimitWindow } from "./rate-limit-core";

export async function consumeLoginAttempt(email: string, source: string) {
  const secret = process.env.RATE_LIMIT_SECRET;

  if (!secret) {
    return false;
  }

  const window = createRateLimitWindow(email, source, secret);

  return consumeRateLimitSafely(async () => {
    const bucket = await db.loginRateLimitBucket.upsert({
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
    });

    return bucket.attempts;
  });
}
