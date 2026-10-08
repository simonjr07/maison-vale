import type { Metadata } from "next";

import { CheckoutView } from "@/components/checkout/checkout-view";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Review your order and continue to secure Stripe payment.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
      <header className="mb-10 border-b border-[#20211d]/15 pb-8 sm:mb-14">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a5f42]">
          Guest checkout
        </p>
        <h1 className="mt-4 text-5xl font-medium tracking-[-0.05em] sm:text-7xl">
          Checkout
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-[#20211d]/60">
          Review current pricing and enter your U.S. shipping details before continuing to Stripe&apos;s secure checkout.
        </p>
      </header>
      <CheckoutView />
    </main>
  );
}
