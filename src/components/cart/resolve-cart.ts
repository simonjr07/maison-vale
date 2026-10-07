import type { CartPayload, ResolvedCartDto } from "@/cart/cart-domain";

export async function requestResolvedCart(
  cart: CartPayload,
  signal?: AbortSignal,
): Promise<ResolvedCartDto> {
  const response = await fetch("/api/cart/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cart),
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("The cart could not be refreshed.");
  }

  return response.json() as Promise<ResolvedCartDto>;
}
