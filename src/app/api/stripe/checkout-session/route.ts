import { PaymentError } from "@/payment/payment-domain";
import {
  CheckoutBusinessError,
  CheckoutValidationError,
} from "@/server/checkout/checkout-resolver";
import { createStripeCheckoutSession } from "@/server/payment/checkout-session";
import {
  RequestBodyTooLargeError,
  getApplicationOrigin,
  getTrustedRequestSource,
  hasExpectedOrigin,
  readBoundedText,
} from "@/server/http/request-security";

const MAX_BODY_LENGTH = 32_768;

export async function POST(request: Request) {
  try {
    const origin = getApplicationOrigin(request.url);
    if (!origin) {
      return Response.json(
        { error: "Secure payment is temporarily unavailable.", code: "PAYMENT_NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    if (!hasExpectedOrigin(request, origin)) {
      return Response.json({ error: "This checkout request is not allowed." }, { status: 403 });
    }

    const body = await readBoundedText(request, MAX_BODY_LENGTH);

    const result = await createStripeCheckoutSession(JSON.parse(body), {
      source: getTrustedRequestSource(request.headers),
      appOrigin: origin,
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
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
    if (error instanceof PaymentError) {
      const status =
        error.code === "CHECKOUT_RATE_LIMITED" ? 429 :
        error.code === "CHECKOUT_ATTEMPT_CONFLICT" ? 409 :
        error.code === "PAYMENT_NOT_CONFIGURED" ? 503 : 502;
      return Response.json({ error: error.message, code: error.code }, { status });
    }
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return Response.json({ error: "The checkout request is invalid." }, { status: 400 });
    }
    console.error("Stripe Checkout Session creation failed.");
    return Response.json(
      { error: "Secure payment could not be started. Please try again." },
      { status: 500 },
    );
  }
}

