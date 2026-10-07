import "server-only";

import { redirect } from "next/navigation";
import type { UserRole } from "@/generated/prisma/enums";

import { auth } from "@/auth";
import { db } from "@/server/db/client";

import { assertRole } from "./permissions";

export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/admin/login");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, active: true },
  });

  if (!user?.active) {
    redirect("/admin/login");
  }

  return { id: user.id, email: user.email, role: user.role };
}

export async function requireRole(...roles: UserRole[]) {
  const user = await requireUser();
  assertRole(user.role, roles);
  return user;
}

export function requireAdmin() {
  return requireRole("ADMIN");
}
