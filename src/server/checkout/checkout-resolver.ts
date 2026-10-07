import type { PrismaClient } from "../../generated/prisma/client";
import {
  type CheckoutSummaryDto,
  type PreparedCheckoutDto,
  calculateCheckoutAmounts,
  checkoutDetailsSchema,
  getCheckoutFieldErrors,
} from "../../checkout/checkout-domain.ts";
import type { ResolvedCartDto } from "../../cart/cart-domain.ts";
import { CartValidationError, createCartResolver } from "../cart/cart-resolver.ts";

export type CheckoutErrorCode =
  | "EMPTY_CART"
  | "STALE_CART"
  | "UNAVAILABLE_CART";

export class CheckoutValidationError extends Error {
  readonly fieldErrors: Record<string, string[]>;

  constructor(fieldErrors: Record<string, string[]>) {
    super("Please review the highlighted checkout details.");
    this.name = "CheckoutValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class CheckoutBusinessError extends Error {
  readonly code: CheckoutErrorCode;
  readonly resolvedCart: ResolvedCartDto;

  constructor(code: CheckoutErrorCode, message: string, resolvedCart: ResolvedCartDto) {
    super(message);
    this.name = "CheckoutBusinessError";
    this.code = code;
    this.resolvedCart = resolvedCart;
  }
}

function toCheckoutSummary(cart: ResolvedCartDto): CheckoutSummaryDto {
  const amounts = calculateCheckoutAmounts(cart.subtotalCents);
  return {
    currency: "USD",
    items: cart.items,
    cart: cart.cart,
    ...amounts,
    shippingMethod: "Standard shipping",
  };
}

export function createCheckoutService(database: PrismaClient) {
  const resolveCart = createCartResolver(database);

  async function quoteCheckout(cartInput: unknown): Promise<CheckoutSummaryDto> {
    let cart: ResolvedCartDto;
    try {
      cart = await resolveCart(cartInput);
    } catch (error) {
      if (error instanceof CartValidationError) {
        throw new CheckoutValidationError({ cart: ["The cart data is invalid."] });
      }
      throw error;
    }

    if (cart.items.length === 0) {
      throw new CheckoutBusinessError(
        "EMPTY_CART",
        "Your cart is empty. Add an item before checking out.",
        cart,
      );
    }

    if (cart.items.some((item) => item.status === "ADJUSTED")) {
      throw new CheckoutBusinessError(
        "STALE_CART",
        "Quantity has changed since you reviewed your cart. Review the updated quantity before continuing.",
        cart,
      );
    }

    if (cart.items.some((item) => item.status !== "AVAILABLE")) {
      throw new CheckoutBusinessError(
        "UNAVAILABLE_CART",
        "One or more items are no longer available. Return to your cart to remove them.",
        cart,
      );
    }

    return toCheckoutSummary(cart);
  }

  async function prepareCheckout(input: unknown): Promise<PreparedCheckoutDto> {
    const parsed = checkoutDetailsSchema.safeParse(input);
    if (!parsed.success) {
      throw new CheckoutValidationError(getCheckoutFieldErrors(parsed.error));
    }

    const summary = await quoteCheckout(parsed.data.cart);
    return {
      ...summary,
      readyForPayment: true,
      message: "Your details and order summary are validated. Payment will be completed securely in the next step.",
    };
  }

  return { quoteCheckout, prepareCheckout };
}
