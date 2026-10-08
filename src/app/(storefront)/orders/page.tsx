import type { Metadata } from "next";

import { OrderLookupForm } from "@/components/orders/order-lookup-form";

export const metadata: Metadata = {
  title: "Find your order",
  description: "Securely view a Maison Vale guest order.",
};

export default function OrderLookupPage() {
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-10">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a5f42]">
          Guest order access
        </p>
        <h1 className="mt-4 max-w-2xl text-5xl font-medium tracking-[-0.05em] sm:text-7xl">
          Find your order.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-[#20211d]/65">
          Enter your order reference and the email used at checkout. Both must match before order details are shown.
        </p>
        <OrderLookupForm />
      </section>

      <aside className="h-fit border border-[#20211d]/15 bg-[#faf8f3] p-6 sm:p-8">
        <h2 className="text-xl font-medium tracking-[-0.02em]">Private by design</h2>
        <p className="mt-4 text-sm leading-6 text-[#20211d]/60">
          Access lasts for 15 minutes in this browser. Order references alone never reveal order details, and sensitive address information remains masked.
        </p>
        <p className="mt-5 border-t border-[#20211d]/10 pt-5 text-xs leading-5 text-[#20211d]/50">
          Guest verification is designed for convenient order access. It is not the same as signing in to a customer account or confirming ownership through email.
        </p>
      </aside>
    </main>
  );
}

