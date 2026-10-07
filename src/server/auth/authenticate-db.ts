import "server-only";

import { db } from "@/server/db/client";

import { authenticateCredentials } from "./authenticate";
import { verifyPassword } from "./password";
import { consumeLoginAttempt } from "./rate-limit";

export async function authenticateCredentialsWithDatabase(input: unknown, source: string) {
  try {
    return await authenticateCredentials(input, source, {
      consumeAttempt: consumeLoginAttempt,
      findUserByEmail: (email) =>
        db.user.findUnique({
          where: { email },
          select: { id: true, role: true, active: true, passwordHash: true },
        }),
      verifyPassword,
    });
  } catch {
    return null;
  }
}
