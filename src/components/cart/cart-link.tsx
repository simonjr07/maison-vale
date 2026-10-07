"use client";

import Link from "next/link";

import { useCart } from "./cart-provider";

export function CartLink() {
  const { count, hydrated } = useCart();
  const label = hydrated ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart";

  return (
    <Link
      aria-label={label}
      className="inline-flex min-h-11 items-center gap-1 px-2 text-[13px] transition-colors hover:text-[#9a5f42] sm:px-3 sm:text-sm"
      href="/cart"
    >
      Cart <span aria-hidden="true">({hydrated ? count : 0})</span>
    </Link>
  );
}
