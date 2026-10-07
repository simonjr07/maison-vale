import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in | Maison Vale",
  description: "Secure staff access for Maison Vale operations.",
};

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-[#e8e1d7] px-6 py-10 text-[#25231f] sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <section className="w-full max-w-md border border-[#25231f]/15 bg-[#f8f5f0] p-7 shadow-[0_24px_70px_rgba(37,35,31,0.10)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8a5a3b]">Maison Vale</p>
          <h1 className="mt-7 text-4xl font-semibold tracking-[-0.04em]">Admin sign in</h1>
          <p className="mt-3 text-base leading-7 text-[#25231f]/65">
            Use your authorized staff credentials to continue.
          </p>
          <LoginForm />
          <p className="mt-8 border-t border-[#25231f]/10 pt-5 text-xs leading-5 text-[#25231f]/55">
            Access is limited to active Maison Vale administrators and staff.
          </p>
        </section>
      </div>
    </main>
  );
}
