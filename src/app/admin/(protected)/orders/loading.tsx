export default function OrdersLoading() {
  return <main aria-busy="true" aria-live="polite"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a5a3b]">Fulfillment</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Orders</h1><div className="mt-8 animate-pulse border border-[#25231f]/10 bg-white p-8 text-sm text-[#25231f]/50">Loading secure order records…</div></main>;
}
