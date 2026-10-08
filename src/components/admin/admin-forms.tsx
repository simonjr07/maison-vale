"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import type { AdminActionState } from "@/app/admin/(protected)/catalogue-actions";

const initialState: AdminActionState = { status: "idle", message: "" };

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} type="submit" className="bg-[#25231f] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#443f37] disabled:cursor-wait disabled:opacity-60">
      {pending ? pendingLabel ?? "Saving…" : label}
    </button>
  );
}

export function AdminActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  confirmMessage,
  warnUnsaved = false,
  className = "",
}: {
  action: (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  children?: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  confirmMessage?: string;
  warnUnsaved?: boolean;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const dirty = useRef(false);

  useEffect(() => {
    if (!warnUnsaved) return;
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [warnUnsaved]);

  useEffect(() => {
    if (state.status === "success") dirty.current = false;
  }, [state.status]);

  return (
    <form
      action={formAction}
      className={className}
      onChange={() => { dirty.current = true; }}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {state.message ? (
        <div role={state.status === "error" ? "alert" : "status"} className={`mb-5 border px-4 py-3 text-sm ${state.status === "error" ? "border-[#9a5f42]/40 bg-[#9a5f42]/8 text-[#733f28]" : "border-[#34463b]/30 bg-[#34463b]/8 text-[#34463b]"}`}>
          <p>{state.message}</p>
          {state.errors ? (
            <ul className="mt-2 list-disc pl-5">
              {Object.values(state.errors).flat().map((message) => <li key={message}>{message}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
      {children}
      <div className="mt-6 flex items-center gap-4">
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
        {warnUnsaved ? <span className="text-xs text-[#25231f]/50">Unsaved changes are not applied to the storefront.</span> : null}
      </div>
    </form>
  );
}
