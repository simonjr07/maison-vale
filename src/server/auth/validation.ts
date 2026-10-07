import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(320, "Email addresses must be 320 characters or fewer.");

const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(MAX_PASSWORD_LENGTH, `Passwords must be ${MAX_PASSWORD_LENGTH} characters or fewer.`)
  .refine((password) => password.trim().length > 0, "Enter a password.");

export const loginCredentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const adminProvisionSchema = loginCredentialsSchema;

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
