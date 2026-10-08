import { requireUser } from "@/server/auth/authorization";

export const instant = false;

export default async function AdminPage() {
  await requireUser();

  return (
    <main>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a5a3b]">Overview</p>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Catalogue operations, kept precise.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[#25231f]/65">
        Review products and inventory from one secure workspace. Administrators can publish catalogue changes and make audited stock adjustments; staff access is read-only.
      </p>
      <section className="mt-10 border border-[#25231f]/12 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-medium">Current scope</h2>
        <ul className="mt-5 grid gap-4 text-sm leading-6 text-[#25231f]/65 sm:grid-cols-2">
          <li>Searchable product catalogue with publication status</li>
          <li>Variant pricing, availability, and archival controls</li>
          <li>Concurrency-aware inventory adjustments with movement history</li>
          <li>Curated image selection and category management</li>
          <li>Verified-payment order review and manual fulfillment history</li>
        </ul>
      </section>
    </main>
  );
}
