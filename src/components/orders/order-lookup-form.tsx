"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LookupResponse = {
  ok?: boolean;
  orderNumber?: string;
  error?: string;
};

export function OrderLookupForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: String(form.get("orderNumber") ?? ""),
          email: String(form.get("email") ?? ""),
        }),
        cache: "no-store",
      });
      const payload = await response.json() as LookupResponse;
      if (!response.ok || !payload.ok || !payload.orderNumber) {
        setError(payload.error ?? "We could not verify those order details.");
        return;
      }
      router.push(`/orders/${encodeURIComponent(payload.orderNumber)}`);
    } catch {
      setError("Order lookup is temporarily unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-10" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-6">
        <div>
          <label className="block text-sm font-medium" htmlFor="order-reference">
            Order reference
          </label>
          <input
            aria-describedby="order-reference-help"
            autoCapitalize="characters"
            autoComplete="off"
            className="mt-2 min-h-12 w-full border border-[#20211d]/25 bg-white/45 px-4 uppercase tracking-[0.08em]"
            id="order-reference"
            maxLength={40}
            name="orderNumber"
            placeholder="MV-20261008-AB12CD34"
            required
          />
          <p className="mt-2 text-xs leading-5 text-[#20211d]/55" id="order-reference-help">
            You received this reference after checkout.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="order-email">
            Checkout email
          </label>
          <input
            autoComplete="email"
            className="mt-2 min-h-12 w-full border border-[#20211d]/25 bg-white/45 px-4"
            id="order-email"
            maxLength={320}
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-6 border-l-2 border-[#9a5f42] bg-white/45 px-4 py-3 text-sm leading-6" role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="mt-7 inline-flex min-h-12 w-full items-center justify-center bg-[#20211d] px-6 text-sm font-medium text-white transition-colors hover:bg-[#34463b] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Verifying order…" : "View order"}
      </button>
    </form>
  );
}

