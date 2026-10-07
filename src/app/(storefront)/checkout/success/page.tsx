import type { Metadata } from "next";
import Link from "next/link";

import { ClearVerifiedCart } from "@/components/payment/clear-verified-cart";
import { shouldClearCart } from "@/payment/payment-status";
import { getCustomerPaymentStatus } from "@/server/payment/payment-status";

export const metadata: Metadata = { title: "Order status" };
export const instant = false;

const copy = {
  CONFIRMED: {
    eyebrow: "Order confirmed",
    title: "Thank you for your order.",
    body: "Payment is confirmed and your order is now being prepared.",
  },
  PROCESSING: {
    eyebrow: "Payment processing",
    title: "We are finalizing your order.",
    body: "Stripe has returned you to Maison Vale, but our verified payment update has not arrived yet. Refresh this page shortly.",
  },
  REVIEW: {
    eyebrow: "Order under review",
    title: "Your payment needs our attention.",
    body: "Payment was received, but we could not move the order into normal fulfillment. The order has been held for a safe manual review.",
  },
  UNVERIFIED: {
    eyebrow: "Payment not verified",
    title: "We could not verify this payment yet.",
    body: "Opening this page does not confirm payment. Return to checkout or use the original Stripe return link to check again.",
  },
} as const;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  const query = await searchParams;
  const sessionId = typeof query.session_id === "string" ? query.session_id : undefined;
  const status = await getCustomerPaymentStatus(sessionId);
  const message = copy[status.state];

  return (
    <main className="mx-auto max-w-4xl px-5 py-20 sm:px-8 sm:py-28">
      {shouldClearCart(status.state) ? <ClearVerifiedCart /> : null}
      <section className="border border-[#20211d]/15 bg-[#faf8f3] px-6 py-14 sm:px-12 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a5f42]">{message.eyebrow}</p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-6xl">{message.title}</h1>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-[#20211d]/65">{message.body}</p>
        {status.orderNumber ? (
          <p className="mt-7 text-sm"><span className="text-[#20211d]/55">Order reference</span><br /><strong className="mt-1 inline-block tracking-wide">{status.orderNumber}</strong></p>
        ) : null}
        <div className="mt-10 flex flex-wrap gap-3">
          {status.state === "PROCESSING" ? <Link className="inline-flex min-h-12 items-center bg-[#20211d] px-6 text-sm font-medium text-white" href={`/checkout/success?session_id=${encodeURIComponent(sessionId ?? "")}`}>Check again</Link> : null}
          <Link className="inline-flex min-h-12 items-center border border-[#20211d] px-6 text-sm font-medium hover:bg-[#20211d] hover:text-white" href="/shop">Continue shopping</Link>
        </div>
      </section>
    </main>
  );
}

