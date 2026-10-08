"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { formatCartMoney } from "@/cart/cart-domain";
import { searchOrdersAction, type OrderListActionState } from "@/app/admin/(protected)/order-actions";

const fieldClass = "min-h-11 w-full border border-[#25231f]/20 bg-white px-3 py-2.5 text-sm";

function SearchButton() {
  const { pending } = useFormStatus();
  return <button className="min-h-11 bg-[#25231f] px-5 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? "Loading…" : "Apply filters"}</button>;
}

function PaginationForm({ state, page, label, action }: { state: OrderListActionState; page: number; label: string; action: (formData: FormData) => void }) {
  const { query } = state.data;
  return <form action={action}>
    <input type="hidden" name="q" value={query.q} />
    <input type="hidden" name="orderStatus" value={query.orderStatus} />
    <input type="hidden" name="paymentStatus" value={query.paymentStatus} />
    <input type="hidden" name="page" value={page} />
    <button className="border border-[#25231f]/20 px-4 py-2 text-sm font-medium hover:bg-white" type="submit">{label}</button>
  </form>;
}

export function AdminOrderList({ initialState }: { initialState: OrderListActionState }) {
  const [state, action] = useActionState(searchOrdersAction, initialState);
  const { data } = state;

  return <>
    <form action={action} className="mt-8 grid gap-4 border border-[#25231f]/12 bg-white p-5 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto] lg:items-end" role="search">
      <input type="hidden" name="page" value="1" />
      <label className="text-sm font-medium">Order reference or customer email<input className={`${fieldClass} mt-2`} defaultValue={data.query.q} maxLength={320} name="q" placeholder="Search orders" /></label>
      <label className="text-sm font-medium">Fulfillment<select className={`${fieldClass} mt-2`} defaultValue={data.query.orderStatus} name="orderStatus"><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="PROCESSING">Processing</option><option value="SHIPPED">Shipped</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option></select></label>
      <label className="text-sm font-medium">Payment<select className={`${fieldClass} mt-2`} defaultValue={data.query.paymentStatus} name="paymentStatus"><option value="ALL">All payments</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="FAILED">Failed</option><option value="PARTIALLY_REFUNDED">Partially refunded</option><option value="REFUNDED">Refunded</option></select></label>
      <SearchButton />
    </form>
    {state.message ? <p className="mt-4 border border-[#9a5f42]/30 bg-[#9a5f42]/8 px-4 py-3 text-sm text-[#733f28]" role="alert">{state.message}</p> : null}
    <p className="mt-5 text-sm text-[#25231f]/55" role="status">{data.total} matching order{data.total === 1 ? "" : "s"}</p>
    {data.orders.length ? <div className="mt-4 grid gap-4">
      {data.orders.map((order) => <article className="border border-[#25231f]/12 bg-white p-5 sm:p-6" key={order.id}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(180px,.7fr)_minmax(180px,.7fr)_auto] lg:items-center">
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-medium">{order.orderNumber}</h2>{order.requiresReview ? <span className="bg-[#9a5f42]/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#7a432d]">Review required</span> : null}</div><p className="mt-2 text-sm text-[#25231f]/60">{order.customerName}</p><p className="mt-1 break-all text-xs text-[#25231f]/50">{order.email}</p><time className="mt-2 block text-xs text-[#25231f]/45" dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</time></div>
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#25231f]/45">Payment</p><p className="mt-2 text-sm font-medium">{order.paymentStatusLabel}</p></div>
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#25231f]/45">Fulfillment</p><p className="mt-2 text-sm font-medium">{order.orderStatusLabel}</p><p className="mt-1 text-sm text-[#25231f]/60">{formatCartMoney(order.totalCents)} {order.currency}</p></div>
          <Link className="border border-[#25231f]/20 px-4 py-2.5 text-center text-sm font-medium hover:bg-[#f5f2ec]" href={`/admin/orders/${order.id}`}>Review order</Link>
        </div>
      </article>)}
    </div> : <section className="mt-4 border border-dashed border-[#25231f]/20 bg-white/45 px-6 py-14 text-center"><h2 className="text-lg font-medium">No orders found</h2><p className="mt-2 text-sm text-[#25231f]/55">Adjust the search or filters to review a different set of orders.</p></section>}
    <nav aria-label="Order pages" className="mt-8 flex items-center justify-between gap-4"><p className="text-sm text-[#25231f]/55">Page {data.page} of {data.pageCount}</p><div className="flex gap-2">{data.page > 1 ? <PaginationForm action={action} state={state} page={data.page - 1} label="Previous" /> : null}{data.page < data.pageCount ? <PaginationForm action={action} state={state} page={data.page + 1} label="Next" /> : null}</div></nav>
  </>;
}
