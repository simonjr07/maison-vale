import "server-only";

import { db } from "@/server/db/client";

import { createOrderLookupService } from "./order-lookup-service";
import { createOrderLookupRateLimiter } from "./rate-limit";

export function getOrderLookupSecret() {
  const secret = process.env.ORDER_LOOKUP_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) return null;
  return secret;
}

export function getOrderLookupService() {
  const secret = getOrderLookupSecret();
  if (!secret) return null;
  return createOrderLookupService(db, {
    secret,
    consumeAttempt: createOrderLookupRateLimiter(db, secret),
  });
}

