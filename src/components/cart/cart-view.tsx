"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  type ResolvedCartDto,
  findChangedPrices,
  formatCartMoney,
  removeCartItem,
  updateCartItemQuantity,
} from "@/cart/cart-domain";

import { useCart } from "./cart-provider";
import { requestResolvedCart } from "./resolve-cart";

export function CartView() {
  const { cart, hydrated, replaceCart, announce } = useCart();
  const [resolved, setResolved] = useState<ResolvedCartDto | null>(null);
  const [changedPrices, setChangedPrices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previousResolved = useRef<ResolvedCartDto | null>(null);

  const refreshCart = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");

      try {
        const next = await requestResolvedCart(cart, signal);
        const changes = findChangedPrices(previousResolved.current, next);
        setChangedPrices(changes);
        previousResolved.current = next;
        setResolved(next);

        if (JSON.stringify(next.cart) !== JSON.stringify(cart)) {
          replaceCart(next.cart);
        }

        if (changes.size > 0) {
          announce("A price in your cart has changed. Current pricing is shown.");
        }
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setError("The cart could not be refreshed. Try again.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    }, [announce, cart, replaceCart]);

  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController();
    const refreshTimer = window.setTimeout(() => {
      void refreshCart(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(refreshTimer);
      controller.abort();
    };
  }, [hydrated, refreshCart]);

  function updateQuantity(variantId: string, quantity: number) {
    const result = updateCartItemQuantity(cart, variantId, quantity);
    if (!result.ok) {
      announce(result.message);
      return;
    }
    replaceCart(result.cart);
    announce("Cart quantity updated.");
  }

  function remove(variantId: string) {
    replaceCart(removeCartItem(cart, variantId));
    announce("Item removed from your cart.");
  }

  const checkoutReady =
    resolved !== null &&
    resolved.items.length > 0 &&
    resolved.items.every((item) => item.status === "AVAILABLE");

  if (!hydrated || (loading && !resolved)) {
    return (
      <div aria-live="polite" className="py-20 text-center text-sm text-[#20211d]/60">
        Refreshing your cart…
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="border border-[#20211d]/15 bg-[#faf8f3] px-6 py-16 text-center sm:py-20">
        <h2 className="text-3xl font-medium tracking-[-0.035em]">Your cart is empty.</h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#20211d]/60">
          Explore the catalogue and choose a variant to begin.
        </p>
        <Link
          className="mt-7 inline-flex min-h-12 items-center bg-[#20211d] px-6 text-sm font-medium text-white hover:bg-[#34463b]"
          href="/shop"
        >
          Browse the catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div>
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#20211d]/15 pb-4">
          <p className="text-sm text-[#20211d]/60">
            Prices and availability are refreshed from the catalogue.
          </p>
          <button
            className="min-h-11 shrink-0 text-sm underline decoration-[#20211d]/25 underline-offset-4 hover:decoration-[#20211d] disabled:opacity-50"
            disabled={loading}
            onClick={() => void refreshCart()}
            type="button"
          >
            {loading ? "Refreshing…" : "Refresh cart"}
          </button>
        </div>

        {error ? (
          <p className="mb-5 border-l-2 border-[#9a5f42] bg-[#faf8f3] px-4 py-3 text-sm text-[#6f432f]" role="alert">
            {error}
          </p>
        ) : null}

        <ul className="divide-y divide-[#20211d]/15">
          {resolved?.items.map((item) => {
            const unavailable =
              item.status === "UNAVAILABLE" || item.status === "OUT_OF_STOCK";
            return (
              <li className="grid gap-5 py-7 sm:grid-cols-[140px_1fr]" key={item.variantId}>
                <div className="relative aspect-[4/5] overflow-hidden bg-[#ded7cb]">
                  <Image
                    alt={item.image.alt}
                    className="object-cover"
                    fill
                    sizes="140px"
                    src={item.image.url}
                  />
                </div>
                <div className="flex min-w-0 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {item.productSlug ? (
                        <Link className="text-lg font-medium hover:underline" href={`/shop/${item.productSlug}`}>
                          {item.productName}
                        </Link>
                      ) : (
                        <h2 className="text-lg font-medium">{item.productName}</h2>
                      )}
                      <p className="mt-1 text-sm text-[#20211d]/60">{item.variantName}</p>
                      {item.size || item.color ? (
                        <p className="mt-1 text-xs text-[#20211d]/50">
                          {[item.size, item.color].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <p>
                        {item.unitPriceCents === null
                          ? "Unavailable"
                          : formatCartMoney(item.unitPriceCents)}
                      </p>
                      {changedPrices.has(item.variantId) ? (
                        <p className="mt-1 text-xs text-[#9a5f42]">Price updated</p>
                      ) : null}
                    </div>
                  </div>

                  {item.message ? (
                    <p className="mt-4 border-l-2 border-[#9a5f42] bg-[#faf8f3] px-3 py-2 text-sm leading-5 text-[#6f432f]">
                      {item.message}
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-end justify-between gap-5 pt-5">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]">Quantity</p>
                      <div className="flex items-center border border-[#20211d]/20">
                        <button
                          aria-label={`Decrease quantity for ${item.productName}`}
                          className="min-h-11 min-w-11 text-lg disabled:opacity-35"
                          disabled={unavailable || item.quantity <= 1}
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          type="button"
                        >
                          −
                        </button>
                        <span className="min-w-10 text-center text-sm" aria-label={`Quantity ${item.quantity}`}>
                          {item.quantity}
                        </span>
                        <button
                          aria-label={`Increase quantity for ${item.productName}`}
                          className="min-h-11 min-w-11 text-lg disabled:opacity-35"
                          disabled={unavailable}
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.14em] text-[#20211d]/50">Line total</p>
                      <p className="mt-1 font-medium">{formatCartMoney(item.lineTotalCents)}</p>
                      <button
                        className="mt-3 min-h-11 text-sm underline decoration-[#20211d]/25 underline-offset-4 hover:decoration-[#20211d]"
                        onClick={() => remove(item.variantId)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="border border-[#20211d]/15 bg-[#faf8f3] p-6 lg:sticky lg:top-8">
        <h2 className="text-xl font-medium">Cart summary</h2>
        <div className="mt-6 flex items-center justify-between border-t border-[#20211d]/15 pt-5">
          <span className="text-sm">Subtotal</span>
          <strong className="text-lg font-medium">
            {formatCartMoney(resolved?.subtotalCents ?? 0)}
          </strong>
        </div>
        <p className="mt-4 text-xs leading-5 text-[#20211d]/55">
          Current prices are shown in USD. Stock is not reserved and will be
          checked again at checkout.
        </p>
        {checkoutReady ? (
          <Link
            className="mt-6 flex min-h-12 items-center justify-center bg-[#20211d] px-6 text-sm font-medium text-white hover:bg-[#34463b]"
            href="/checkout"
          >
            Continue to checkout
          </Link>
        ) : (
          <p className="mt-6 border-t border-[#20211d]/10 pt-5 text-sm leading-6 text-[#6f432f]">
            Resolve unavailable or adjusted items before continuing to checkout.
          </p>
        )}
      </aside>
    </div>
  );
}
