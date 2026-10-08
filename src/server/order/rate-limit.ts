import type { PrismaClient } from "../../generated/prisma/client.ts";
import {
  consumeRateLimitSafely,
  createRateLimitWindow,
  isLoginAttemptAllowed,
} from "../auth/rate-limit-core.ts";

export function createOrderLookupRateLimiter(database: PrismaClient, secret: string) {
  return async function consumeOrderLookupAttempt(input: {
    orderNumber: string;
    email: string;
    source: string;
  }) {
    if (!secret) return false;
    const windows = [
      createRateLimitWindow("order-lookup-source", input.source, secret),
      createRateLimitWindow(
        `order-lookup-proof:${input.orderNumber}:${input.email}`,
        "proof",
        secret,
      ),
    ];

    return consumeRateLimitSafely(async () => {
      const attempts = await database.$transaction(
        windows.map((window) => database.loginRateLimitBucket.upsert({
          where: {
            keyHash_windowStart: {
              keyHash: window.keyHash,
              windowStart: window.windowStart,
            },
          },
          update: { attempts: { increment: 1 } },
          create: { ...window, attempts: 1 },
          select: { attempts: true },
        })),
      );
      return attempts.every((bucket) => isLoginAttemptAllowed(bucket.attempts))
        ? Math.max(...attempts.map((bucket) => bucket.attempts))
        : Number.MAX_SAFE_INTEGER;
    });
  };
}

