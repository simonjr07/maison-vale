import Link from "next/link";

import { AdminActionForm } from "@/components/admin/admin-forms";
import { fieldClass } from "@/components/admin/catalogue-fields";
import { canManageCatalogue } from "@/server/admin/catalogue-domain";
import { requireUser } from "@/server/auth/authorization";
import { db } from "@/server/db/client";
import { setInventoryAction } from "../catalogue-actions";

export const instant = false;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [user, raw] = await Promise.all([requireUser(), searchParams]);
  const q = typeof raw.q === "string" ? raw.q.trim().slice(0, 120) : "";
  const variants = await db.productVariant.findMany({
    where: q ? { OR: [{ sku: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { product: { name: { contains: q, mode: "insensitive" } } }] } : {},
    orderBy: [{ product: { name: "asc" } }, { name: "asc" }], take: 50,
    select: { id: true, sku: true, name: true, stockQuantity: true, active: true, product: { select: { id: true, name: true, active: true, published: true } }, inventoryMovements: { orderBy: { createdAt: "desc" }, take: 3, select: { id: true, quantityDelta: true, reason: true, createdAt: true } } },
  });
  const canManage = canManageCatalogue(user.role);
  return <main><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a5a3b]">Stock authority</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Inventory</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#25231f]/60">Set exact variant quantities with optimistic concurrency checks. Every successful change creates an inventory movement.</p></div><form className="mt-8 flex gap-3" role="search"><label className="sr-only" htmlFor="inventory-search">Search inventory</label><input id="inventory-search" name="q" defaultValue={q} className="min-w-0 flex-1 border border-[#25231f]/20 bg-white px-4 py-3 text-sm" placeholder="Search product, variant, or SKU" maxLength={120} /><button className="border border-[#25231f]/25 px-5 py-3 text-sm font-medium">Search</button></form>
    <div className="mt-6 grid gap-4">{variants.map((variant) => <article key={variant.id} className="border border-[#25231f]/12 bg-white p-5 sm:p-6"><div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between"><div><Link href={`/admin/products/${variant.product.id}`} className="font-medium underline-offset-4 hover:underline">{variant.product.name}</Link><p className="mt-1 text-sm text-[#25231f]/55">{variant.name} · {variant.sku} · {variant.active ? "Active" : "Archived"}</p><p className="mt-4 text-3xl font-semibold">{variant.stockQuantity}</p><p className="text-xs uppercase tracking-wider text-[#25231f]/45">units on hand</p></div>{canManage ? <AdminActionForm action={setInventoryAction} submitLabel="Record adjustment" confirmMessage={`Set ${variant.sku} to the entered quantity?`} className="w-full md:max-w-xs"><input type="hidden" name="variantId" value={variant.id} /><input type="hidden" name="expectedQuantity" value={variant.stockQuantity} /><label className="text-sm font-medium">New exact quantity<input className={fieldClass} type="number" name="quantity" defaultValue={variant.stockQuantity} min={0} max={100000} step={1} required /></label></AdminActionForm> : <p className="text-sm text-[#25231f]/50">Read only</p>}</div>{variant.inventoryMovements.length ? <details className="mt-5 border-t border-[#25231f]/10 pt-4"><summary className="cursor-pointer text-sm font-medium">Recent movement history</summary><ul className="mt-3 grid gap-2 text-xs text-[#25231f]/55">{variant.inventoryMovements.map((movement) => <li key={movement.id}>{movement.createdAt.toLocaleString("en-US")} · {movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta} · {movement.reason.toLowerCase().replaceAll("_", " ")}</li>)}</ul></details> : null}</article>)}</div>{variants.length === 0 ? <p className="mt-6 border border-dashed border-[#25231f]/20 p-12 text-center text-sm text-[#25231f]/55">No inventory records match this search.</p> : null}</main>;
}
