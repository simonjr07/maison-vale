import type { ReactNode } from "react";

import { requireUser } from "@/server/auth/authorization";

import { signOutAction } from "../actions";

export const instant = false;

const navigation = ["Overview", "Products", "Inventory", "Orders", "Analytics"];

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-[#f1eee8] text-[#25231f]">
      <header className="border-b border-[#25231f]/12 bg-[#25231f] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d2b89f]">Maison Vale</p>
            <p className="mt-2 text-lg font-medium">Operations</p>
          </div>
          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:gap-5">
            <div>
              <p className="text-white/80">{user.email}</p>
              <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-[#d2b89f]">{user.role}</p>
            </div>
            <form action={signOutAction}>
              <button className="border border-white/25 px-4 py-2 text-sm transition hover:border-white/50 hover:bg-white/10" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[220px_1fr] lg:py-12">
        <nav aria-label="Admin navigation" className="border-b border-[#25231f]/12 pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {navigation.map((item, index) => (
              <li key={item}>
                <div className={`flex items-center justify-between px-3 py-2.5 text-sm ${index === 0 ? "bg-white font-medium shadow-sm" : "text-[#25231f]/55"}`}>
                  <span>{item}</span>
                  {index > 0 ? <span className="text-[10px] uppercase tracking-wider">Planned</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </nav>
        {children}
      </div>
    </div>
  );
}
