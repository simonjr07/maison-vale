"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { getPublicLoginError } from "@/server/auth/login-errors";
import { loginCredentialsSchema } from "@/server/auth/validation";

export type LoginActionState = {
  message?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginCredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      message: "Review the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: getPublicLoginError() };
    }
    throw error;
  }

  return {};
}
