import { CartValidationError } from "@/server/cart/cart-resolver";
import { resolveCart } from "@/server/cart/cart";

const MAX_BODY_LENGTH = 16_384;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (body.length > MAX_BODY_LENGTH) {
      return Response.json({ error: "The cart request is too large." }, { status: 413 });
    }

    const cart = await resolveCart(JSON.parse(body));
    return Response.json(cart, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof CartValidationError || error instanceof SyntaxError) {
      return Response.json({ error: "The cart data is invalid." }, { status: 400 });
    }

    return Response.json(
      { error: "The cart could not be refreshed. Try again." },
      { status: 500 },
    );
  }
}
