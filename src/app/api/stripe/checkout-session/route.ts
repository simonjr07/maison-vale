import { PaymentError } from "@/payment/payment-domain";
import {
  CheckoutBusinessError,
  CheckoutValidationError,
} from "@/server/checkout/checkout-resolver";
import { createStripeCheckoutSession } from "@/server/payment/checkout-session";

const MAX_BODY_LENGTH = 32_768;

function sourceFrom(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unavailable"
  ).slice(0, 128);
}

function applicationOrigin(request: Request) {
  const configured = process.env.APP_URL?.trim();
  return new URL(configured || request.url).origin;
}

export async function POST(request: Request) {
  try {
    const origin = applicationOrigin(request);
    const requestOrigin = request.headers.get("origin");
    if (requestOrigin && new URL(requestOrigin).origin !== origin) {
      return Response.json({ error: "This checkout request is not allowed." }, { status: 403 });
    }

    const body = await request.text();
    if (body.length > MAX_BODY_LENGTH) {
      return Response.json({ error: "The checkout request is too large." }, { status: 413 });
    }

    const result = await createStripeCheckoutSession(JSON.parse(body), {
      source: sourceFrom(request),
      appOrigin: origin,
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
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

