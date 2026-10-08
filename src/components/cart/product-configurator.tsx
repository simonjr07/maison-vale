"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  MAX_CART_ITEM_QUANTITY,
  addCartItem,
} from "@/cart/cart-domain";
import type { ProductDetailDto } from "@/server/catalogue/catalogue-core";

import { useCart } from "./cart-provider";
import { requestResolvedCart } from "./resolve-cart";
import {
  canAddVariant,
  createAddedToBagNotice,
  getInitialVariantId,
  getSelectedVariant,
  isVariantSelectable,
  type AddedToBagNotice,
} from "./product-configurator-state";

type Variant = ProductDetailDto["variants"][number];

export function ProductConfigurator({ variants }: { variants: Variant[] }) {
  const { cart, replaceCart, announce, hydrated } = useCart();
  const initialVariantId = useMemo(() => getInitialVariantId(variants), [variants]);
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("");
  const [addedNotice, setAddedNotice] = useState<AddedToBagNotice | null>(null);
  const [pending, setPending] = useState(false);
  const selected = getSelectedVariant(variants, selectedVariantId);

  function clearFeedback() {
    setStatus("");
    setAddedNotice(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    if (!selected || !canAddVariant(selected)) {
      setStatus(selected?.stockMessage === "Sold out" ? "This variant is sold out." : "Choose an available variant.");
      return;
    }

    const prospective = addCartItem(cart, selected.id, quantity);
    if (!prospective.ok) {
      setStatus(prospective.message);
      return;
    }

    setPending(true);
    try {
      const existingQuantity = cart.items.find((item) => item.variantId === selected.id)?.quantity ?? 0;
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
      if (resolvedItem.quantity <= existingQuantity) {
        setStatus("Your bag already contains the available quantity for this variant.");
        return;
      }

      const notice = createAddedToBagNotice(
        selected.name,
        resolvedItem.status === "ADJUSTED" ? resolvedItem.message : null,
      );
      setAddedNotice(notice);
      announce(`${notice.title}. ${notice.detail}`);
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
            const selectable = isVariantSelectable(variant);
            const addable = canAddVariant(variant);
            return (
              <label
                className={`flex min-h-16 items-center justify-between gap-5 border px-4 py-3 transition-colors ${
                  selectedVariantId === variant.id
                    ? "border-[#20211d] bg-[#faf8f3]"
                    : "border-[#20211d]/15"
                } ${selectable ? "cursor-pointer hover:border-[#20211d]/50" : "cursor-not-allowed opacity-55"} ${!addable && selectable ? "bg-[#20211d]/[0.025]" : ""}`}
                key={variant.id}
              >
                <span className="flex items-center gap-3">
                  <input
                    checked={selectedVariantId === variant.id}
                    disabled={!selectable}
                    name="variant"
                    onChange={() => {
                      setSelectedVariantId(variant.id);
                      clearFeedback();
                    }}
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
                    {variant.stockMessage}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div aria-atomic="true" aria-live="polite" className="mt-5 min-h-6" id="selected-stock-status">
        {selected ? (
          <p className={`text-sm font-medium ${selected.stockMessage === "Sold out" ? "text-[#8a4b36]" : "text-[#34463b]"}`}>
            {selected.stockMessage}
          </p>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[110px_1fr]">
        <label className="text-sm" htmlFor="product-quantity">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">
            Quantity
          </span>
          <input
            className="min-h-12 w-full border border-[#20211d]/25 bg-transparent px-3"
            id="product-quantity"
            max={MAX_CART_ITEM_QUANTITY}
            min={1}
            onChange={(event) => {
              setQuantity(Number(event.target.value));
              clearFeedback();
            }}
            type="number"
            value={quantity}
          />
        </label>
        <button
          className="mt-auto min-h-12 bg-[#20211d] px-6 text-sm font-medium text-white transition-colors hover:bg-[#34463b] disabled:cursor-not-allowed disabled:opacity-50"
          aria-describedby="selected-stock-status"
          disabled={!hydrated || !canAddVariant(selected) || pending}
          type="submit"
        >
          {!hydrated ? "Preparing bag…" : pending ? "Checking availability…" : selected?.stockMessage === "Sold out" ? "Sold out" : "Add to bag"}
        </button>
      </div>
      <p aria-live="polite" role={status ? "alert" : undefined} className="mt-3 min-h-5 text-sm text-[#6f432f]">
        {status}
      </p>
      {addedNotice ? (
        <div aria-atomic="true" aria-live="polite" className="mt-4 border border-[#34463b]/25 bg-[#f3f5f0] p-5" role="status">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-[#28382f]">{addedNotice.title}</p>
              <p className="mt-1 text-sm leading-6 text-[#20211d]/65">{addedNotice.detail}</p>
            </div>
            <button aria-label="Dismiss added-to-bag confirmation" className="-mr-1 -mt-1 min-h-9 min-w-9 text-xl text-[#20211d]/50 transition hover:text-[#20211d]" onClick={() => setAddedNotice(null)} type="button">×</button>
          </div>
          <Link className="mt-4 inline-flex min-h-11 items-center justify-center border border-[#34463b] px-5 text-sm font-medium text-[#34463b] transition hover:bg-[#34463b] hover:text-white" href="/cart">View bag</Link>
        </div>
      ) : null}
    </form>
  );
}
