import Link from "next/link";

import { adminListQuerySchema, canManageCatalogue } from "@/server/admin/catalogue-domain";
import { createAdminCatalogueService } from "@/server/admin/catalogue-service";
import { requireUser } from "@/server/auth/authorization";
import { formatUsd } from "@/server/catalogue/catalogue-core";
import { db } from "@/server/db/client";

export const instant = false;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [user, raw] = await Promise.all([requireUser(), searchParams]);
  const query = adminListQuerySchema.parse({ q: typeof raw.q === "string" ? raw.q : "", page: typeof raw.page === "string" ? raw.page : 1 });
  const result = await createAdminCatalogueService(db).listProducts(query);
  const canManage = canManageCatalogue(user.role);
  const href = (page: number) => `/admin/products?${new URLSearchParams({ ...(query.q ? { q: query.q } : {}), page: String(page) })}`;

  return (
    <main>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a5a3b]">Catalogue</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Products</h1><p className="mt-3 text-sm text-[#25231f]/60">{result.total} product{result.total === 1 ? "" : "s"} across active and archived records.</p></div>
        {canManage ? <Link href="/admin/products/new" className="bg-[#25231f] px-5 py-3 text-center text-sm font-medium text-white">Create product</Link> : <p className="text-sm text-[#25231f]/55">Staff view · read only</p>}
      </div>
      <form className="mt-8 flex gap-3" role="search"><label className="sr-only" htmlFor="product-search">Search products</label><input id="product-search" name="q" defaultValue={query.q} className="min-w-0 flex-1 border border-[#25231f]/20 bg-white px-4 py-3 text-sm" placeholder="Search name, slug, or SKU" maxLength={120} /><button className="border border-[#25231f]/25 px-5 py-3 text-sm font-medium">Search</button></form>
      {result.products.length ? <div className="mt-6 grid gap-4">
        {result.products.map((product) => {
          const activeVariants = product.variants.filter((variant) => variant.active);
          const prices = activeVariants.map((variant) => variant.priceCents);
          const stock = activeVariants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
          return <article key={product.id} className="border border-[#25231f]/12 bg-white p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-medium">{product.name}</h2><span className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${product.active && product.published && product.category.active ? "bg-[#34463b]/10 text-[#34463b]" : "bg-[#25231f]/8 text-[#25231f]/55"}`}>{product.active && product.published && product.category.active ? "Published" : product.active ? "Draft" : "Archived"}</span></div><p className="mt-2 text-sm text-[#25231f]/55">{product.category.name} · {activeVariants.length} active variant{activeVariants.length === 1 ? "" : "s"} · {stock} units</p><p className="mt-1 text-sm">{prices.length ? `${formatUsd(Math.min(...prices))}${Math.min(...prices) !== Math.max(...prices) ? `–${formatUsd(Math.max(...prices))}` : ""}` : "No active price"}</p></div><Link href={`/admin/products/${product.id}`} className="border border-[#25231f]/20 px-4 py-2 text-center text-sm font-medium">Review product</Link></div></article>;
        })}
      </div> : <div className="mt-6 border border-dashed border-[#25231f]/20 bg-white/50 px-6 py-14 text-center"><h2 className="text-lg font-medium">No products found</h2><p className="mt-2 text-sm text-[#25231f]/55">Try a broader search or create the first product.</p></div>}
      <nav className="mt-8 flex items-center justify-between text-sm" aria-label="Product pages"><span>Page {result.page} of {result.pageCount}</span><div className="flex gap-2">{result.page > 1 ? <Link className="border border-[#25231f]/20 px-4 py-2" href={href(result.page - 1)}>Previous</Link> : null}{result.page < result.pageCount ? <Link className="border border-[#25231f]/20 px-4 py-2" href={href(result.page + 1)}>Next</Link> : null}</div></nav>
    </main>
  );
}
