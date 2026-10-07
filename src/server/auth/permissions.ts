import type { UserRole } from "@/generated/prisma/enums";

export class AuthorizationError extends Error {
  constructor() {
    super("You do not have permission to perform this action.");
    this.name = "AuthorizationError";
  }
}

export function hasRole(role: UserRole, allowedRoles: readonly UserRole[]) {
  return allowedRoles.includes(role);
}

export function assertRole(role: UserRole, allowedRoles: readonly UserRole[]) {
  if (!hasRole(role, allowedRoles)) {
    throw new AuthorizationError();
  }
}
