"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { transitionOrderAction, type OrderTransitionActionState } from "@/app/admin/(protected)/order-actions";

const initialState: OrderTransitionActionState = { status: "idle", message: "" };

function TransitionButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="min-h-11 bg-[#25231f] px-5 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? "Recording…" : label}</button>;
}

export function OrderTransitionForm({ orderId, expectedStatus, targetStatus, label }: { orderId: string; expectedStatus: "PROCESSING" | "SHIPPED"; targetStatus: "SHIPPED" | "DELIVERED"; label: string }) {
  const [state, action] = useActionState(transitionOrderAction, initialState);
  const confirmation = targetStatus === "SHIPPED"
    ? "Confirm that this order was physically dispatched? No tracking or carrier event will be created."
    : "Confirm manual delivery? This records an administrator confirmation, not a carrier-verified event.";
  return <form action={action} onSubmit={(event) => { if (!window.confirm(confirmation)) event.preventDefault(); }}>
    <input type="hidden" name="orderId" value={orderId} />
    <input type="hidden" name="expectedStatus" value={expectedStatus} />
    <input type="hidden" name="targetStatus" value={targetStatus} />
    {state.message ? <p className={`mb-4 border px-4 py-3 text-sm ${state.status === "error" ? "border-[#9a5f42]/35 bg-[#9a5f42]/8 text-[#733f28]" : "border-[#34463b]/30 bg-[#34463b]/8 text-[#34463b]"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    <TransitionButton label={label} />
  </form>;
}
