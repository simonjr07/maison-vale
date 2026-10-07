import type { UserRole } from "@/generated/prisma/enums";

import { loginCredentialsSchema } from "./validation";

const DUMMY_PASSWORD_HASH = "$2b$12$S1odJFE.crt7pHv25HxJ1uyg9muDn82u1wOr7vtdLWWFKr2ji/Ese";

export type AuthenticatedIdentity = {
  id: string;
  role: UserRole;
};

type AuthenticationUser = AuthenticatedIdentity & {
  active: boolean;
  passwordHash: string;
};

export type AuthenticationDependencies = {
  consumeAttempt: (email: string, source: string) => Promise<boolean>;
  findUserByEmail: (email: string) => Promise<AuthenticationUser | null>;
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
};

export async function authenticateCredentials(
  input: unknown,
  source: string,
  dependencies: AuthenticationDependencies,
): Promise<AuthenticatedIdentity | null> {
  const parsed = loginCredentialsSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  const { email, password } = parsed.data;
  const attemptAllowed = await dependencies.consumeAttempt(email, source);

  if (!attemptAllowed) {
    return null;
  }

  const user = await dependencies.findUserByEmail(email);
  const passwordMatches = await dependencies.verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !user.active || !passwordMatches) {
    return null;
  }

  return { id: user.id, role: user.role };
}
