import type { PrismaClient } from "../../generated/prisma/client";
import {
  CART_VERSION,
  type CartItemInput,
  type ResolvedCartDto,
  type ResolvedCartItemDto,
  normalizeCart,
} from "../../cart/cart-domain.ts";
import { getVariantAvailability } from "../inventory/inventory-domain.ts";

const FALLBACK_IMAGE = {
  url: "/catalogue/fallback.svg",
  alt: "Maison Vale product image placeholder",
};

export class CartValidationError extends Error {
  constructor() {
    super("The cart data is invalid.");
    this.name = "CartValidationError";
  }
}

function unavailableItem(item: CartItemInput): ResolvedCartItemDto {
  return {
    variantId: item.variantId,
    productName: "Unavailable item",
    productSlug: null,
    variantName: "No longer available",
    size: null,
    color: null,
    image: FALLBACK_IMAGE,
    requestedQuantity: item.quantity,
    quantity: item.quantity,
    unitPriceCents: null,
    lineTotalCents: 0,
    status: "UNAVAILABLE",
    message: "This item is no longer available. Remove it from your cart.",
  };
}

export function createCartResolver(database: PrismaClient) {
  return async function resolveCart(input: unknown): Promise<ResolvedCartDto> {
    const cart = normalizeCart(input);
    if (!cart) throw new CartValidationError();

    if (cart.items.length === 0) {
      return { currency: "USD", items: [], cart, subtotalCents: 0 };
    }

    const variants = await database.productVariant.findMany({
      where: { id: { in: cart.items.map((item) => item.variantId) } },
      select: {
        id: true,
        name: true,
        size: true,
        color: true,
        priceCents: true,
        stockQuantity: true,
        active: true,
        product: {
          select: {
            name: true,
            slug: true,
            active: true,
            published: true,
            category: { select: { active: true } },
            images: {
              select: { url: true, altText: true },
              orderBy: { sortOrder: "asc" },
              take: 1,
            },
          },
        },
      },
    });
    const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

    const resolvedItems = cart.items.map((item): ResolvedCartItemDto => {
      const variant = variantsById.get(item.variantId);
      if (!variant || !variant.product.category.active) return unavailableItem(item);

      const availability = getVariantAvailability({
        productActive: variant.product.active,
        productPublished: variant.product.published,
        variantActive: variant.active,
        stockQuantity: variant.stockQuantity,
      });

      if (availability === "Unavailable") return unavailableItem(item);

      const image = variant.product.images[0]
        ? {
            url: variant.product.images[0].url,
            alt: variant.product.images[0].altText,
          }
        : FALLBACK_IMAGE;
      const common = {
        variantId: variant.id,
        productName: variant.product.name,
        productSlug: variant.product.slug,
        variantName: variant.name,
        size: variant.size,
        color: variant.color,
        image,
        requestedQuantity: item.quantity,
        unitPriceCents: variant.priceCents,
      };

      if (availability === "Out of stock") {
        return {
          ...common,
          quantity: item.quantity,
          lineTotalCents: 0,
          status: "OUT_OF_STOCK",
          message: "This item is currently out of stock.",
        };
      }

      if (item.quantity > variant.stockQuantity) {
        return {
          ...common,
          quantity: variant.stockQuantity,
          lineTotalCents: variant.priceCents * variant.stockQuantity,
          status: "ADJUSTED",
          message: `Only ${variant.stockQuantity} remain available. Quantity adjusted to the current available amount.`,
        };
      }

      return {
        ...common,
        quantity: item.quantity,
        lineTotalCents: variant.priceCents * item.quantity,
        status: "AVAILABLE",
        message: null,
      };
    });

    const normalizedItems = resolvedItems.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    return {
      currency: "USD",
      items: resolvedItems,
      cart: { version: CART_VERSION, items: normalizedItems },
      subtotalCents: resolvedItems.reduce(
        (total, item) => total + item.lineTotalCents,
        0,
      ),
    };
  };
}
