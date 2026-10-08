import Link from "next/link";

import { AdminActionForm } from "@/components/admin/admin-forms";
import { ProductFields, VariantFields } from "@/components/admin/catalogue-fields";
import { createAdminCatalogueService } from "@/server/admin/catalogue-service";
import { requireAdmin } from "@/server/auth/authorization";
import { db } from "@/server/db/client";
import { createProductAction } from "../../catalogue-actions";

export const instant = false;

export default async function NewProductPage() {
  await requireAdmin();
  const categories = (await createAdminCatalogueService(db).listCategories()).filter((category) => category.active);
  return <main><Link href="/admin/products" className="text-sm text-[#25231f]/60">← Products</Link><p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-[#8a5a3b]">New catalogue record</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Create product</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#25231f]/60">Create the product and its first variant together. Opening inventory is zero and must be recorded separately as an audited adjustment.</p><AdminActionForm action={createProductAction} submitLabel="Create product" pendingLabel="Creating…" warnUnsaved className="mt-8 border border-[#25231f]/12 bg-white p-6 sm:p-8"><ProductFields categories={categories} /><div className="my-8 border-t border-[#25231f]/12" /><h2 className="mb-5 text-xl font-medium">First variant</h2><VariantFields prefix="variant" /></AdminActionForm></main>;
}
