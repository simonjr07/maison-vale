"use client";

export default function OrdersError({ reset }: { reset: () => void }) {
  return <main><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a5a3b]">Fulfillment</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Orders are temporarily unavailable.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-[#25231f]/60">The secure order workspace could not be loaded. No order data was changed.</p><button className="mt-6 bg-[#25231f] px-5 py-3 text-sm font-medium text-white" onClick={reset} type="button">Try again</button></main>;
}
