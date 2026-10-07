import { requireUser } from "@/server/auth/authorization";

export const instant = false;

export default async function AdminPage() {
  await requireUser();

  return (
    <main>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a5a3b]">Overview</p>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">The operations foundation is ready.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[#25231f]/65">
        Product, inventory, order, and analytics modules will be introduced in later project phases. This area currently confirms secure staff access and role-aware authorization.
      </p>
      <section className="mt-10 border border-[#25231f]/12 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-medium">Current scope</h2>
        <ul className="mt-5 grid gap-4 text-sm leading-6 text-[#25231f]/65 sm:grid-cols-2">
          <li>Credentials-based sign-in for active administrators and staff</li>
          <li>Server-side session and current-user verification</li>
          <li>Reusable role authorization helpers for future operations</li>
          <li>Database-backed login attempt limiting</li>
        </ul>
      </section>
    </main>
  );
}
