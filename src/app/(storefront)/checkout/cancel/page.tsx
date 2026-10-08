import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Checkout cancelled" };

export default function CheckoutCancelPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-20 sm:px-8 sm:py-28">
      <section className="border border-[#20211d]/15 bg-[#faf8f3] px-6 py-14 sm:px-12 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a5f42]">Checkout paused</p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-6xl">Your checkout was cancelled.</h1>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-[#20211d]/65">No payment status is inferred from leaving Stripe. Your cart is still available, and you can return when you are ready.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link className="inline-flex min-h-12 items-center bg-[#20211d] px-6 text-sm font-medium text-white" href="/checkout">Return to checkout</Link>
          <Link className="inline-flex min-h-12 items-center border border-[#20211d] px-6 text-sm font-medium hover:bg-[#20211d] hover:text-white" href="/cart">Review cart</Link>
        </div>
      </section>
    </main>
  );
}

