import Link from "next/link";

import { formatCartMoney } from "@/cart/cart-domain";
import type { PublicOrderDetails } from "@/order/order-lookup-domain";

const paymentCopy = {
  PENDING: ["Payment pending", "We have not received a verified payment confirmation."],
  CONFIRMED: ["Payment confirmed", "Payment has been verified."],
  FAILED: ["Payment not completed", "The payment record shows that payment did not complete."],
  PARTIALLY_REFUNDED: ["Partially refunded", "Part of this payment has been refunded."],
  REFUNDED: ["Refunded", "This payment has been refunded."],
} as const;

const fulfillmentCopy = {
  AWAITING_PAYMENT: ["Awaiting payment", "Fulfillment will not begin until payment is verified."],
  REVIEW_REQUIRED: ["Manual review", "Payment or inventory needs attention before normal fulfillment can continue."],
  PROCESSING: ["Preparing your order", "Your order is in the fulfillment queue."],
  SHIPPED: ["Shipped", "The order is marked as shipped. Carrier tracking is not available in this project phase."],
  DELIVERED: ["Delivered", "The order is marked as delivered."],
  CANCELLED: ["Cancelled", "This order is marked as cancelled."],
} as const;

function formatDate(value: string, includeTime = false) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
    timeZone: "UTC",
  }).format(new Date(value));
}

export function OrderDetails({ order }: { order: PublicOrderDetails }) {
  const payment = paymentCopy[order.paymentState];
  const fulfillment = fulfillmentCopy[order.fulfillmentState];

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
      <header className="flex flex-col gap-7 border-b border-[#20211d]/15 pb-9 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a5f42]">Guest order</p>
          <h1 className="mt-4 text-4xl font-medium tracking-[-0.045em] sm:text-6xl">{order.orderNumber}</h1>
          <p className="mt-4 text-sm text-[#20211d]/55">Placed {formatDate(order.placedAt)}</p>
        </div>
        <Link className="inline-flex min-h-11 items-center text-sm underline decoration-[#20211d]/25 underline-offset-4 hover:decoration-[#20211d]" href="/orders">
          Find another order
        </Link>
      </header>

      <section aria-label="Order status" className="grid gap-4 py-8 sm:grid-cols-2">
        <article className="border border-[#20211d]/15 bg-[#faf8f3] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#20211d]/45">Payment</p>
          <h2 className="mt-3 text-xl font-medium">{payment[0]}</h2>
          <p className="mt-2 text-sm leading-6 text-[#20211d]/60">{payment[1]}</p>
        </article>
        <article className="border border-[#20211d]/15 bg-[#faf8f3] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#20211d]/45">Fulfillment</p>
          <h2 className="mt-3 text-xl font-medium">{fulfillment[0]}</h2>
          <p className="mt-2 text-sm leading-6 text-[#20211d]/60">{fulfillment[1]}</p>
        </article>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section>
          <h2 className="text-2xl font-medium tracking-[-0.025em]">Items</h2>
          <ul className="mt-5 divide-y divide-[#20211d]/10 border-y border-[#20211d]/15">
            {order.items.map((item, index) => (
              <li className="grid gap-3 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8" key={`${item.productName}-${item.variantName}-${index}`}>
                <div>
                  <h3 className="font-medium">{item.productName}</h3>
                  <p className="mt-1 text-sm text-[#20211d]/55">{item.variantName}</p>
                  <p className="mt-3 text-xs text-[#20211d]/50">Quantity {item.quantity} · {formatCartMoney(item.unitPriceCents)} each</p>
                </div>
                <p className="font-medium sm:text-right">{formatCartMoney(item.lineTotalCents)}</p>
              </li>
            ))}
          </ul>

          {order.timeline.length > 0 ? (
            <section className="mt-12">
              <h2 className="text-2xl font-medium tracking-[-0.025em]">Order history</h2>
              <ol className="mt-6 border-l border-[#20211d]/20 pl-6">
                {order.timeline.map((event, index) => (
                  <li className="relative pb-7 last:pb-0" key={`${event.occurredAt}-${index}`}>
                    <span aria-hidden="true" className="absolute -left-[1.72rem] top-1 h-3 w-3 rounded-full border-2 border-[#f3efe8] bg-[#34463b]" />
                    <p className="font-medium">{event.label}</p>
                    <time className="mt-1 block text-xs text-[#20211d]/50" dateTime={event.occurredAt}>{formatDate(event.occurredAt, true)}</time>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </section>

        <aside className="space-y-5 lg:sticky lg:top-8">
          <section className="border border-[#20211d]/15 bg-[#faf8f3] p-6">
            <h2 className="text-xl font-medium">Order total</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt>Subtotal</dt><dd>{formatCartMoney(order.subtotalCents)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Shipping</dt><dd>{order.shippingCents === 0 ? "Free" : formatCartMoney(order.shippingCents)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Tax</dt><dd>{formatCartMoney(order.taxCents)}</dd></div>
              <div className="flex justify-between gap-4 border-t border-[#20211d]/15 pt-4 text-base font-medium"><dt>Total</dt><dd>{formatCartMoney(order.totalCents)}</dd></div>
            </dl>
          </section>
          <section className="border border-[#20211d]/15 bg-[#faf8f3] p-6">
            <h2 className="text-xl font-medium">Shipping destination</h2>
            <address className="mt-4 not-italic text-sm leading-6 text-[#20211d]/60">
              {order.destination.recipient}<br />
              {order.destination.locality} {order.destination.postalCode}<br />
              {order.destination.country}
            </address>
            <p className="mt-4 border-t border-[#20211d]/10 pt-4 text-xs leading-5 text-[#20211d]/50">Street address and contact details are hidden for privacy.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}

export function OrderAccessRequired() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-20 sm:px-8 sm:py-28">
      <section className="border border-[#20211d]/15 bg-[#faf8f3] px-6 py-14 sm:px-12 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a5f42]">Order access required</p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-6xl">Verify your order again.</h1>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-[#20211d]/65">This order link is private. Your lookup session may be missing, expired, or scoped to a different order.</p>
        <Link className="mt-9 inline-flex min-h-12 items-center bg-[#20211d] px-6 text-sm font-medium text-white hover:bg-[#34463b]" href="/orders">Return to order lookup</Link>
      </section>
    </main>
  );
}

