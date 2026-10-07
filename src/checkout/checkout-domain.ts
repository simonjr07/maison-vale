import { z } from "zod";

import type { CartPayload, ResolvedCartItemDto } from "@/cart/cart-domain";

export const CHECKOUT_COUNTRY = "US" as const;
export const STANDARD_SHIPPING_CENTS = 800;
export const FREE_SHIPPING_THRESHOLD_CENTS = 15_000;
export const CHECKOUT_TAX_CENTS = 0;

const noControlCharacters = (value: string) =>
  !/[\u0000-\u001f\u007f]/.test(value);

function textField(label: string, maximum: number) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(maximum, `${label} must be ${maximum} characters or fewer.`)
    .refine(noControlCharacters, `${label} contains unsupported characters.`);
}

export const checkoutDetailsSchema = z
  .object({
    contact: z
      .object({
        email: z
          .string()
          .trim()
          .min(1, "Email is required.")
          .max(320, "Email must be 320 characters or fewer.")
          .email("Enter a valid email address.")
          .transform((value) => value.toLowerCase()),
      })
      .strip(),
    shippingAddress: z
      .object({
        fullName: textField("Full name", 160),
        line1: textField("Address line 1", 200),
        line2: z
          .string()
          .trim()
          .max(200, "Address line 2 must be 200 characters or fewer.")
          .refine(noControlCharacters, "Address line 2 contains unsupported characters.")
          .optional()
          .transform((value) => value || null),
        city: textField("City", 120),
        region: textField("State or region", 120),
        postalCode: z
          .string()
          .trim()
          .regex(/^\d{5}(?:-\d{4})?$/, "Enter a valid U.S. ZIP code."),
        country: z.literal(CHECKOUT_COUNTRY, {
          error: "Maison Vale currently ships only within the United States.",
        }),
      })
      .strip(),
    cart: z.unknown(),
  })
  .strip();

export type CheckoutDetails = z.infer<typeof checkoutDetailsSchema>;
export type CheckoutDetailsInput = z.input<typeof checkoutDetailsSchema>;

export type CheckoutSummaryDto = {
  currency: "USD";
  items: ResolvedCartItemDto[];
  cart: CartPayload;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingMethod: "Standard shipping";
};

export type PreparedCheckoutDto = CheckoutSummaryDto & {
  readyForPayment: true;
  message: string;
};

export function calculateShippingCents(subtotalCents: number) {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS
    ? 0
    : STANDARD_SHIPPING_CENTS;
}

export function calculateCheckoutAmounts(subtotalCents: number) {
  const shippingCents = calculateShippingCents(subtotalCents);
  const taxCents = CHECKOUT_TAX_CENTS;
  return {
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents + shippingCents + taxCents,
  };
}

export function getCheckoutFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return fieldErrors;
}
