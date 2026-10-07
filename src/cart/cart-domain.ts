import { z } from "zod";

export const CART_VERSION = 1 as const;
export const CART_STORAGE_KEY = "maison-vale-cart-v1";
export const MAX_CART_LINES = 20;
export const MAX_CART_ITEM_QUANTITY = 20;
export const MAX_CART_TOTAL_QUANTITY = 50;

export type CartItemInput = {
  variantId: string;
  quantity: number;
};

export type CartPayload = {
  version: typeof CART_VERSION;
  items: CartItemInput[];
};

export type ResolvedCartItemStatus =
  | "AVAILABLE"
  | "ADJUSTED"
  | "OUT_OF_STOCK"
  | "UNAVAILABLE";

export type ResolvedCartItemDto = {
  variantId: string;
  productName: string;
  productSlug: string | null;
  variantName: string;
  size: string | null;
  color: string | null;
  image: { url: string; alt: string };
  requestedQuantity: number;
  quantity: number;
  unitPriceCents: number | null;
  lineTotalCents: number;
  status: ResolvedCartItemStatus;
  message: string | null;
};

export type ResolvedCartDto = {
  currency: "USD";
  items: ResolvedCartItemDto[];
  cart: CartPayload;
  subtotalCents: number;
};

const cartItemSchema = z
  .object({
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1).max(MAX_CART_ITEM_QUANTITY),
  })
  .strip();

const persistedCartSchema = z
  .object({
    version: z.literal(CART_VERSION),
    items: z.array(cartItemSchema).max(MAX_CART_LINES),
  })
  .strip();

export function normalizeCart(input: unknown): CartPayload | null {
  const parsed = persistedCartSchema.safeParse(input);
  if (!parsed.success) return null;

  const mergedItems = new Map<string, number>();
  for (const item of parsed.data.items) {
    const quantity = (mergedItems.get(item.variantId) ?? 0) + item.quantity;
    if (quantity > MAX_CART_ITEM_QUANTITY) return null;
    mergedItems.set(item.variantId, quantity);
  }

  const items = [...mergedItems].map(([variantId, quantity]) => ({
    variantId,
    quantity,
  }));
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);

  if (items.length > MAX_CART_LINES || totalQuantity > MAX_CART_TOTAL_QUANTITY) {
    return null;
  }

  return { version: CART_VERSION, items };
}

export function parseStoredCart(value: string | null): CartPayload {
  if (!value) return { version: CART_VERSION, items: [] };

  try {
    return normalizeCart(JSON.parse(value)) ?? { version: CART_VERSION, items: [] };
  } catch {
    return { version: CART_VERSION, items: [] };
  }
}

export type CartMutationResult =
  | { ok: true; cart: CartPayload }
  | { ok: false; message: string };

export function addCartItem(
  cart: CartPayload,
  variantId: string,
  quantity: number,
): CartMutationResult {
  const item = cartItemSchema.safeParse({ variantId, quantity });
  if (!item.success) {
    return { ok: false, message: "Choose a valid quantity." };
  }

  const existing = cart.items.find((entry) => entry.variantId === variantId);
  if (!existing && cart.items.length >= MAX_CART_LINES) {
    return { ok: false, message: "Your cart has reached its item limit." };
  }

  const nextQuantity = (existing?.quantity ?? 0) + quantity;
  if (nextQuantity > MAX_CART_ITEM_QUANTITY) {
    return {
      ok: false,
      message: `A cart item can contain up to ${MAX_CART_ITEM_QUANTITY} units.`,
    };
  }

  const currentTotal = getCartCount(cart.items);
  if (currentTotal + quantity > MAX_CART_TOTAL_QUANTITY) {
    return {
      ok: false,
      message: `Your cart can contain up to ${MAX_CART_TOTAL_QUANTITY} units.`,
    };
  }

  const items = existing
    ? cart.items.map((entry) =>
        entry.variantId === variantId
          ? { ...entry, quantity: nextQuantity }
          : entry,
      )
    : [...cart.items, item.data];

  return { ok: true, cart: { version: CART_VERSION, items } };
}

export function updateCartItemQuantity(
  cart: CartPayload,
  variantId: string,
  quantity: number,
): CartMutationResult {
  if (!cart.items.some((item) => item.variantId === variantId)) {
    return { ok: false, message: "This item is not in your cart." };
  }

  const parsed = cartItemSchema.safeParse({ variantId, quantity });
  if (!parsed.success) {
    return { ok: false, message: "Choose a valid quantity." };
  }

  const items = cart.items.map((item) =>
    item.variantId === variantId ? parsed.data : item,
  );
  if (getCartCount(items) > MAX_CART_TOTAL_QUANTITY) {
    return {
      ok: false,
      message: `Your cart can contain up to ${MAX_CART_TOTAL_QUANTITY} units.`,
    };
  }

  return { ok: true, cart: { version: CART_VERSION, items } };
}

export function removeCartItem(cart: CartPayload, variantId: string): CartPayload {
  return {
    version: CART_VERSION,
    items: cart.items.filter((item) => item.variantId !== variantId),
  };
}

export function getCartCount(items: CartItemInput[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function findChangedPrices(
  previous: ResolvedCartDto | null,
  current: ResolvedCartDto,
) {
  if (!previous) return new Set<string>();

  const previousPrices = new Map(
    previous.items.map((item) => [item.variantId, item.unitPriceCents]),
  );

  return new Set(
    current.items
      .filter(
        (item) =>
          previousPrices.has(item.variantId) &&
          previousPrices.get(item.variantId) !== item.unitPriceCents,
      )
      .map((item) => item.variantId),
  );
}

export function formatCartMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
