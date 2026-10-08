import {
  CheckoutBusinessError,
  CheckoutValidationError,
} from "@/server/checkout/checkout-resolver";
import { prepareCheckout } from "@/server/checkout/checkout";
import { RequestBodyTooLargeError, readBoundedText } from "@/server/http/request-security";

const MAX_BODY_LENGTH = 32_768;

export async function POST(request: Request) {
  try {
    const body = await readBoundedText(request, MAX_BODY_LENGTH);
    const checkout = await prepareCheckout(JSON.parse(body));
    return Response.json(checkout, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "The checkout request is too large." }, { status: 413 });
    }
    if (error instanceof CheckoutValidationError) {
      return Response.json(
        { error: error.message, fieldErrors: error.fieldErrors },
        { status: 400 },
      );
    }
    if (error instanceof CheckoutBusinessError) {
      return Response.json(
        { error: error.message, code: error.code, cart: error.resolvedCart.cart },
        { status: 409 },
      );
    }
    if (error instanceof SyntaxError) {
      return Response.json({ error: "The checkout request is invalid." }, { status: 400 });
    }

    return Response.json(
      { error: "Checkout could not be prepared. Try again." },
      { status: 500 },
    );
  }
}
