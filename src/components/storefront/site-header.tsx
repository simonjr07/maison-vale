import Link from "next/link";

import { CartLink } from "@/components/cart/cart-link";

export function SiteHeader() {
  return (
    <header className="border-b border-[#20211d]/15 bg-[#f3efe8]">
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:min-h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-0 lg:px-10">
        <Link
          className="inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-[0.22em] sm:text-sm sm:tracking-[0.3em]"
          href="/"
        >
          Maison Vale
        </Link>
        <nav aria-label="Primary navigation" className="w-full border-t border-[#20211d]/10 sm:w-auto sm:border-0">
          <ul className="grid grid-cols-4 items-center sm:flex sm:gap-4">
            <li>
              <Link
                className="inline-flex min-h-11 w-full items-center justify-center px-1 text-xs transition-colors hover:text-[#9a5f42] sm:w-auto sm:px-3 sm:text-sm"
                href="/shop"
              >
                Shop
              </Link>
            </li>
            <li>
              <Link
                className="inline-flex min-h-11 w-full items-center justify-center px-1 text-xs transition-colors hover:text-[#9a5f42] sm:w-auto sm:px-3 sm:text-sm"
                href="/#collections"
              >
                Collections
              </Link>
            </li>
            <li>
              <Link
                className="inline-flex min-h-11 w-full items-center justify-center px-1 text-xs transition-colors hover:text-[#9a5f42] sm:w-auto sm:px-3 sm:text-sm"
                href="/orders"
              >
                Orders
              </Link>
            </li>
            <li>
              <CartLink />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
