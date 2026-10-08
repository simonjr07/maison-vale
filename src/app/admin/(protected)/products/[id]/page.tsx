import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminActionForm } from "@/components/admin/admin-forms";
import { ProductFields, VariantFields } from "@/components/admin/catalogue-fields";
import { canManageCatalogue } from "@/server/admin/catalogue-domain";
import { createAdminCatalogueService } from "@/server/admin/catalogue-service";
import { requireUser } from "@/server/auth/authorization";
import { formatUsd } from "@/server/catalogue/catalogue-core";
import { db } from "@/server/db/client";
import {
  archiveProductAction,
  archiveVariantAction,
  createVariantAction,
  updateProductAction,
  updateVariantAction,
} from "../../catalogue-actions";

export const instant = false;

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> }) {
  const [{ id }, user, notice] = await Promise.all([params, requireUser(), searchParams]);
  const service = createAdminCatalogueService(db);
  const [product, categories] = await Promise.all([service.getProduct(id), service.listCategories()]);
  if (!product) notFound();
  const canManage = canManageCatalogue(user.role);

  return <main>
    <Link href="/admin/products" className="text-sm text-[#25231f]/60">← Products</Link>
    {notice.notice === "created" ? <p role="status" className="mt-6 border border-[#34463b]/30 bg-[#34463b]/8 px-4 py-3 text-sm text-[#34463b]">Product created. Add stock before publishing it for purchase.</p> : null}
    <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a5a3b]">Product record</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">{product.name}</h1><p className="mt-3 text-sm text-[#25231f]/55">{product.slug} · Updated {product.updatedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}</p></div>{product.images[0] ? <Image src={product.images[0].url} alt={product.images[0].altText} width={120} height={144} className="h-28 w-24 border border-[#25231f]/10 bg-[#eee8df] object-cover" /> : null}</div>
    {!canManage ? <p className="mt-8 border border-[#25231f]/12 bg-white px-5 py-4 text-sm text-[#25231f]/60">You have read-only staff access. An administrator must make catalogue changes.</p> : null}
    <section className="mt-8"><h2 className="text-xl font-medium">Product details</h2>{canManage ? <AdminActionForm action={updateProductAction.bind(null, id)} submitLabel="Save product" warnUnsaved className="mt-4 border border-[#25231f]/12 bg-white p-6 sm:p-8"><ProductFields product={{ ...product, categoryId: product.categoryId }} categories={categories.filter((category) => category.active || category.id === product.categoryId)} /></AdminActionForm> : <div className="mt-4 border border-[#25231f]/12 bg-white p-6 text-sm leading-7"><p>{product.description}</p><p className="mt-4 text-[#25231f]/55">Category: {product.category.name} · {product.active ? "Active" : "Archived"} · {product.published ? "Published" : "Not published"}</p></div>}</section>
    <section className="mt-10"><div className="flex items-end justify-between"><div><h2 className="text-xl font-medium">Variants</h2><p className="mt-2 text-sm text-[#25231f]/55">Pricing and availability metadata. Stock changes belong in Inventory.</p></div><Link href={`/admin/inventory?q=${encodeURIComponent(product.name)}`} className="text-sm font-medium underline underline-offset-4">Open inventory</Link></div>
      <div className="mt-4 grid gap-5">{product.variants.map((variant) => <article key={variant.id} className="border border-[#25231f]/12 bg-white p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium">{variant.name}</h3><p className="mt-1 text-xs text-[#25231f]/50">{variant.sku} · {formatUsd(variant.priceCents)} · {variant.stockQuantity} units · {variant.active ? "Active" : "Archived"}</p></div></div>{canManage ? <><AdminActionForm action={updateVariantAction.bind(null, variant.id)} submitLabel="Save variant" warnUnsaved><VariantFields variant={variant} /></AdminActionForm>{variant.active ? <AdminActionForm action={archiveVariantAction.bind(null, variant.id)} submitLabel="Archive variant" confirmMessage="Archive this variant? It will become unavailable, while order history remains intact." className="mt-5 border-t border-[#25231f]/10 pt-5"><p className="text-xs text-[#25231f]/50">Archiving is reversible only through a deliberate edit. It never deletes historical order data.</p></AdminActionForm> : null}</> : <p className="text-sm text-[#25231f]/55">{variant.size || "No size"} · {variant.color || "No color"}</p>}</article>)}</div>
      {canManage ? <AdminActionForm action={createVariantAction.bind(null, id)} submitLabel="Add variant" warnUnsaved className="mt-6 border border-dashed border-[#25231f]/25 bg-white/50 p-6"><h3 className="mb-5 text-lg font-medium">Add variant</h3><VariantFields /></AdminActionForm> : null}
    </section>
    {canManage && product.active ? <section className="mt-10 border border-[#9a5f42]/25 bg-[#9a5f42]/6 p-6"><h2 className="text-lg font-medium">Archive product</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#25231f]/60">Removes the product from sale and unpublishes it without deleting product, order, or inventory history.</p><AdminActionForm action={archiveProductAction.bind(null, id)} submitLabel="Archive product" confirmMessage="Archive and unpublish this product? Existing order history will be preserved." className="mt-4" /></section> : null}
  </main>;
}
