import type { Metadata } from "next";

import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your saved Maison Vale selections.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
      <header className="mb-10 border-b border-[#20211d]/15 pb-8 sm:mb-14">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a5f42]">
          Your selections
        </p>
        <h1 className="mt-4 text-5xl font-medium tracking-[-0.05em] sm:text-7xl">
          Cart
        </h1>
      </header>
      <CartView />
    </main>
  );
}
