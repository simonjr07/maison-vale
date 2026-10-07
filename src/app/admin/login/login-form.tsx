"use client";

import { useActionState } from "react";

import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-10 space-y-6" noValidate>
      <div>
        <label className="block text-sm font-medium text-[#25231f]" htmlFor="email">
          Email address
        </label>
        <input
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          autoComplete="email"
          className="mt-2 w-full rounded-sm border border-[#25231f]/20 bg-white px-4 py-3 text-base outline-none transition focus:border-[#8a5a3b] focus:ring-2 focus:ring-[#8a5a3b]/15"
          id="email"
          name="email"
          required
          type="email"
        />
        {state.fieldErrors?.email?.[0] ? (
          <p className="mt-2 text-sm text-[#9b352c]" id="email-error">
            {state.fieldErrors.email[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#25231f]" htmlFor="password">
          Password
        </label>
        <input
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          autoComplete="current-password"
          className="mt-2 w-full rounded-sm border border-[#25231f]/20 bg-white px-4 py-3 text-base outline-none transition focus:border-[#8a5a3b] focus:ring-2 focus:ring-[#8a5a3b]/15"
          id="password"
          name="password"
          required
          type="password"
        />
        {state.fieldErrors?.password?.[0] ? (
          <p className="mt-2 text-sm text-[#9b352c]" id="password-error">
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
      </div>

      {state.message ? (
        <p aria-live="polite" className="border-l-2 border-[#9b352c] pl-3 text-sm text-[#6f2a24]" role="status">
          {state.message}
        </p>
      ) : null}

      <button
        className="flex w-full items-center justify-center bg-[#25231f] px-5 py-3.5 text-sm font-medium tracking-wide text-white transition hover:bg-[#3a3731] disabled:cursor-wait disabled:opacity-65"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
