"use client";

import { useMemo, useState } from "react";

import {
  MAX_CART_ITEM_QUANTITY,
  addCartItem,
} from "@/cart/cart-domain";
import type { ProductDetailDto } from "@/server/catalogue/catalogue-core";

import { useCart } from "./cart-provider";
import { requestResolvedCart } from "./resolve-cart";

type Variant = ProductDetailDto["variants"][number];

export function ProductConfigurator({ variants }: { variants: Variant[] }) {
  const { cart, replaceCart, announce } = useCart();
  const firstAvailable = useMemo(
    () => variants.find((variant) => variant.availability === "In stock")?.id ?? "",
    [variants],
  );
  const [selectedVariantId, setSelectedVariantId] = useState(firstAvailable);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    const selected = variants.find((variant) => variant.id === selectedVariantId);
    if (!selected || selected.availability !== "In stock") {
      setStatus("Choose an available variant.");
      return;
    }

    const prospective = addCartItem(cart, selected.id, quantity);
    if (!prospective.ok) {
      setStatus(prospective.message);
      return;
    }

    setPending(true);
    try {
      const resolved = await requestResolvedCart(prospective.cart);
      const resolvedItem = resolved.items.find(
        (item) => item.variantId === selected.id,
      );

      if (
        !resolvedItem ||
        resolvedItem.status === "UNAVAILABLE" ||
        resolvedItem.status === "OUT_OF_STOCK"
      ) {
        setStatus(resolvedItem?.message ?? "This variant is no longer available.");
        return;
      }

      replaceCart(resolved.cart);
      const message =
        resolvedItem.status === "ADJUSTED"
          ? `${resolvedItem.message} The item was added to your cart.`
          : `${selected.name} was added to your cart.`;
      setStatus(message);
      announce(message);
    } catch {
      setStatus("The cart could not be updated. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-10" onSubmit={handleSubmit}>
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.2em]">
          Choose a variant
        </legend>
        <div className="mt-4 grid gap-2">
          {variants.map((variant) => {
            const available = variant.availability === "In stock";
            return (
              <label
                className={`flex min-h-16 items-center justify-between gap-5 border px-4 py-3 transition-colors ${
                  selectedVariantId === variant.id
                    ? "border-[#20211d] bg-[#faf8f3]"
                    : "border-[#20211d]/15"
                } ${available ? "cursor-pointer hover:border-[#20211d]/50" : "cursor-not-allowed opacity-55"}`}
                key={variant.id}
              >
                <span className="flex items-center gap-3">
                  <input
                    checked={selectedVariantId === variant.id}
                    disabled={!available}
                    name="variant"
                    onChange={() => setSelectedVariantId(variant.id)}
                    type="radio"
                    value={variant.id}
                  />
                  <span>
                    <span className="block text-sm font-medium">{variant.name}</span>
                    {variant.size || variant.color ? (
                      <span className="mt-1 block text-xs text-[#20211d]/55">
                        {[variant.size, variant.color].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="text-right text-sm">
                  <span className="block">{variant.price}</span>
                  <span className="mt-1 block text-xs text-[#20211d]/55">
                    {variant.availability}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-3 sm:grid-cols-[110px_1fr]">
        <label className="text-sm" htmlFor="product-quantity">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">
            Quantity
          </span>
          <input
            className="min-h-12 w-full border border-[#20211d]/25 bg-transparent px-3"
            id="product-quantity"
            max={MAX_CART_ITEM_QUANTITY}
            min={1}
            onChange={(event) => setQuantity(Number(event.target.value))}
            type="number"
            value={quantity}
          />
        </label>
        <button
          className="mt-auto min-h-12 bg-[#20211d] px-6 text-sm font-medium text-white transition-colors hover:bg-[#34463b] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!firstAvailable || pending}
          type="submit"
        >
          {pending ? "Checking availability…" : "Add to cart"}
        </button>
      </div>
      <p aria-live="polite" className="mt-3 min-h-5 text-sm text-[#6f432f]">
        {status}
      </p>
    </form>
  );
}
