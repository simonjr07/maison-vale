"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { formatCartMoney } from "@/cart/cart-domain";
import type {
  CheckoutDetailsInput,
  CheckoutSummaryDto,
  PreparedCheckoutDto,
} from "@/checkout/checkout-domain";
import { useCart } from "@/components/cart/cart-provider";

import {
  CheckoutRequestError,
  requestCheckoutQuote,
  requestPreparedCheckout,
} from "./checkout-client";

function fieldId(path: string) {
  return `checkout-${path.replaceAll(".", "-")}`;
}

function FieldError({ errors, path }: { errors: Record<string, string[]>; path: string }) {
  const message = errors[path]?.[0];
  return message ? (
    <p className="mt-2 text-sm text-[#6f432f]" id={`${fieldId(path)}-error`}>
      {message}
    </p>
  ) : null;
}

function Summary({ summary }: { summary: CheckoutSummaryDto }) {
  return (
    <aside className="border border-[#20211d]/15 bg-[#faf8f3] p-5 sm:p-7 lg:sticky lg:top-8">
      <h2 className="text-2xl font-medium tracking-[-0.025em]">Order summary</h2>
      <ul className="mt-6 divide-y divide-[#20211d]/10 border-y border-[#20211d]/10">
        {summary.items.map((item) => (
          <li className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 py-5" key={item.variantId}>
            <div className="relative aspect-[4/5] overflow-hidden bg-[#ded7cb]">
              <Image alt={item.image.alt} className="object-cover" fill sizes="72px" src={item.image.url} />
            </div>
            <div className="min-w-0 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{item.productName}</p>
                  <p className="mt-1 text-[#20211d]/55">{item.variantName}</p>
                </div>
                <p className="shrink-0">{formatCartMoney(item.lineTotalCents)}</p>
              </div>
              <p className="mt-2 text-xs text-[#20211d]/50">
                {item.quantity} × {formatCartMoney(item.unitPriceCents ?? 0)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Subtotal</dt>
          <dd>{formatCartMoney(summary.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>{summary.shippingMethod}</dt>
          <dd>{summary.shippingCents === 0 ? "Free" : formatCartMoney(summary.shippingCents)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Tax</dt>
          <dd>{formatCartMoney(summary.taxCents)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-[#20211d]/15 pt-4 text-lg">
          <dt className="font-medium">Total</dt>
          <dd className="font-medium">{formatCartMoney(summary.totalCents)}</dd>
        </div>
      </dl>
      <p className="mt-5 text-xs leading-5 text-[#20211d]/55">
        U.S. standard shipping is $8, or free on merchandise subtotals of $150 or more. Automated sales-tax calculation is not included in this project phase, so tax is $0.
      </p>
    </aside>
  );
}

export function CheckoutView() {
  const { cart, hydrated } = useCart();
  const [summary, setSummary] = useState<CheckoutSummaryDto | null>(null);
  const [prepared, setPrepared] = useState<PreparedCheckoutDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const loadQuote = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    setSummary(null);
    try {
      setSummary(await requestCheckoutQuote(cart, signal));
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError(
        requestError instanceof CheckoutRequestError
          ? requestError.message
          : "Checkout could not be loaded. Try again.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [cart]);

  useEffect(() => {
    if (!hydrated || cart.items.length === 0) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadQuote(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cart.items.length, hydrated, loadQuote]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: CheckoutDetailsInput = {
      contact: { email: String(form.get("email") ?? "") },
      shippingAddress: {
        fullName: String(form.get("fullName") ?? ""),
        line1: String(form.get("line1") ?? ""),
        line2: String(form.get("line2") ?? ""),
        city: String(form.get("city") ?? ""),
        region: String(form.get("region") ?? ""),
        postalCode: String(form.get("postalCode") ?? ""),
        country: "US",
      },
      cart,
    };

    setSubmitting(true);
    setError("");
    setStatus("");
    setFieldErrors({});
    setPrepared(null);
    try {
      const next = await requestPreparedCheckout(input);
      const changed = summary !== null && summary.totalCents !== next.totalCents;
      setSummary(next);
      setPrepared(next);
      setStatus(
        changed
          ? "Your order summary was updated with current pricing. Review the new total before the payment step."
          : next.message,
      );
    } catch (requestError) {
      if (requestError instanceof CheckoutRequestError) {
        setError(requestError.message);
        setFieldErrors(requestError.payload.fieldErrors ?? {});
      } else {
        setError("Checkout could not be prepared. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated || (loading && cart.items.length > 0)) {
    return <div aria-live="polite" className="py-20 text-center text-sm text-[#20211d]/60">Preparing checkout…</div>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="border border-[#20211d]/15 bg-[#faf8f3] px-6 py-16 text-center sm:py-20">
        <h2 className="text-3xl font-medium tracking-[-0.035em]">Your cart is empty.</h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#20211d]/60">Add an available item before beginning checkout.</p>
        <Link className="mt-7 inline-flex min-h-12 items-center bg-[#20211d] px-6 text-sm font-medium text-white hover:bg-[#34463b]" href="/shop">Browse the catalogue</Link>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="border border-[#20211d]/15 bg-[#faf8f3] px-6 py-14 text-center">
        <h2 className="text-2xl font-medium">Checkout needs your attention.</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#6f432f]" role="alert">{error}</p>
        <Link className="mt-7 inline-flex min-h-12 items-center border border-[#20211d] px-6 text-sm font-medium hover:bg-[#20211d] hover:text-white" href="/cart">Return to cart</Link>
      </div>
    );
  }

  const errorEntries = Object.entries(fieldErrors);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <form noValidate onChange={() => { setPrepared(null); setStatus(""); }} onSubmit={handleSubmit}>
        {error ? (
          <div className="mb-8 border-l-2 border-[#9a5f42] bg-[#faf8f3] px-5 py-4" role="alert">
            <p className="font-medium">{error}</p>
            {errorEntries.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                {errorEntries.map(([path, messages]) => (
                  <li key={path}><a className="underline underline-offset-4" href={`#${fieldId(path)}`}>{messages[0]}</a></li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <fieldset>
          <legend className="text-2xl font-medium tracking-[-0.025em]">Contact</legend>
          <p className="mt-2 text-sm text-[#20211d]/55">Used only for this checkout and not saved at this stage.</p>
          <label className="mt-6 block text-sm font-medium" htmlFor={fieldId("contact.email")}>Email address</label>
          <input aria-describedby={fieldErrors["contact.email"] ? `${fieldId("contact.email")}-error` : undefined} aria-invalid={Boolean(fieldErrors["contact.email"])} autoComplete="email" className="mt-2 min-h-12 w-full border border-[#20211d]/25 bg-[#faf8f3] px-4" id={fieldId("contact.email")} maxLength={320} name="email" required type="email" />
          <FieldError errors={fieldErrors} path="contact.email" />
        </fieldset>

        <fieldset className="mt-12 border-t border-[#20211d]/15 pt-10">
          <legend className="text-2xl font-medium tracking-[-0.025em]">Shipping address</legend>
          <p className="mt-2 text-sm text-[#20211d]/55">Maison Vale currently ships within the United States only.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {[
              ["shippingAddress.fullName", "Full name", "fullName", "name", 160],
              ["shippingAddress.line1", "Address line 1", "line1", "address-line1", 200],
              ["shippingAddress.line2", "Address line 2 (optional)", "line2", "address-line2", 200],
              ["shippingAddress.city", "City", "city", "address-level2", 120],
              ["shippingAddress.region", "State or region", "region", "address-level1", 120],
              ["shippingAddress.postalCode", "ZIP code", "postalCode", "postal-code", 10],
            ].map(([path, label, name, autoComplete, maxLength], index) => (
              <div className={index < 3 ? "sm:col-span-2" : ""} key={path}>
                <label className="block text-sm font-medium" htmlFor={fieldId(String(path))}>{label}</label>
                <input aria-describedby={fieldErrors[String(path)] ? `${fieldId(String(path))}-error` : undefined} aria-invalid={Boolean(fieldErrors[String(path)])} autoComplete={String(autoComplete)} className="mt-2 min-h-12 w-full border border-[#20211d]/25 bg-[#faf8f3] px-4" id={fieldId(String(path))} maxLength={Number(maxLength)} name={String(name)} required={name !== "line2"} />
                <FieldError errors={fieldErrors} path={String(path)} />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium" htmlFor={fieldId("shippingAddress.country")}>Country</label>
              <input className="mt-2 min-h-12 w-full border border-[#20211d]/15 bg-[#e9e4dc] px-4 text-[#20211d]/65" id={fieldId("shippingAddress.country")} readOnly value="United States" />
            </div>
          </div>
        </fieldset>

        <div className="mt-10 border-t border-[#20211d]/15 pt-8">
          <button className="min-h-12 w-full bg-[#20211d] px-6 text-sm font-medium text-white hover:bg-[#34463b] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" disabled={submitting} type="submit">{submitting ? "Validating checkout…" : "Validate checkout details"}</button>
          <p className="mt-4 max-w-xl text-xs leading-5 text-[#20211d]/55">This validates your details, cart, inventory, and total. It does not create an order or collect payment.</p>
        </div>

        <div aria-live="polite" className="mt-7 min-h-6">
          {status ? <p className="border-l-2 border-[#34463b] bg-[#faf8f3] px-4 py-3 text-sm leading-6">{status}</p> : null}
        </div>
        {prepared ? <p className="mt-2 text-sm text-[#20211d]/60">No payment or inventory change has occurred.</p> : null}
      </form>
      <Summary summary={summary} />
    </div>
  );
}
