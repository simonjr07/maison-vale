import type { CartPayload } from "@/cart/cart-domain";
import type {
  CheckoutDetailsInput,
  CheckoutSummaryDto,
  PreparedCheckoutDto,
} from "@/checkout/checkout-domain";
import type { CheckoutSessionResult } from "@/payment/payment-domain";

type CheckoutErrorPayload = {
  error?: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  cart?: CartPayload;
};

export class CheckoutRequestError extends Error {
  readonly status: number;
  readonly payload: CheckoutErrorPayload;

  constructor(status: number, payload: CheckoutErrorPayload) {
    super(payload.error ?? "Checkout could not be prepared.");
    this.name = "CheckoutRequestError";
    this.status = status;
    this.payload = payload;
  }
}

async function postCheckout<T>(url: string, input: unknown, signal?: AbortSignal) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
    signal,
  });
  const payload = (await response.json()) as T | CheckoutErrorPayload;
  if (!response.ok) {
    throw new CheckoutRequestError(response.status, payload as CheckoutErrorPayload);
  }
  return payload as T;
}

export function requestCheckoutQuote(cart: CartPayload, signal?: AbortSignal) {
  return postCheckout<CheckoutSummaryDto>("/api/checkout/quote", cart, signal);
}

export function requestPreparedCheckout(input: CheckoutDetailsInput) {
  return postCheckout<PreparedCheckoutDto>("/api/checkout/prepare", input);
}

export function requestStripeCheckout(
  input: CheckoutDetailsInput & { attemptToken: string },
) {
  return postCheckout<CheckoutSessionResult>("/api/stripe/checkout-session", input);
}
