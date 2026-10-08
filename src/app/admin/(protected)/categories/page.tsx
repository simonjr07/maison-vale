import { AdminActionForm } from "@/components/admin/admin-forms";
import { fieldClass, labelClass } from "@/components/admin/catalogue-fields";
import { canManageCatalogue } from "@/server/admin/catalogue-domain";
import { createAdminCatalogueService } from "@/server/admin/catalogue-service";
import { requireUser } from "@/server/auth/authorization";
import { db } from "@/server/db/client";
import { createCategoryAction, updateCategoryAction } from "../catalogue-actions";

export const instant = false;

function CategoryFields({ category }: { category?: { name: string; slug: string; description: string | null; active: boolean } }) {
  return <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Name<input className={fieldClass} name="name" defaultValue={category?.name} required maxLength={120} /></label><label className={labelClass}>Slug<input className={fieldClass} name="slug" defaultValue={category?.slug} required maxLength={160} /></label><label className={`${labelClass} sm:col-span-2`}>Description<textarea className={`${fieldClass} min-h-24`} name="description" defaultValue={category?.description ?? ""} maxLength={2000} /></label><label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="active" defaultChecked={category?.active ?? true} /> Active category</label></div>;
}

export default async function CategoriesPage() {
  const user = await requireUser();
  const categories = await createAdminCatalogueService(db).listCategories();
  const canManage = canManageCatalogue(user.role);
  return <main><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a5a3b]">Taxonomy</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Categories</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#25231f]/60">Organize products without deleting historical records. A category with published products cannot be deactivated.</p><div className="mt-8 grid gap-5">{categories.map((category) => <article key={category.id} className="border border-[#25231f]/12 bg-white p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-medium">{category.name}</h2><p className="mt-1 text-xs text-[#25231f]/50">{category._count.products} product{category._count.products === 1 ? "" : "s"} · {category.active ? "Active" : "Inactive"}</p></div></div>{canManage ? <AdminActionForm action={updateCategoryAction.bind(null, category.id)} submitLabel="Save category" warnUnsaved><CategoryFields category={category} /></AdminActionForm> : <p className="text-sm text-[#25231f]/60">/{category.slug}<br />{category.description || "No description"}</p>}</article>)}</div>{canManage ? <AdminActionForm action={createCategoryAction} submitLabel="Create category" warnUnsaved className="mt-6 border border-dashed border-[#25231f]/25 bg-white/50 p-6"><h2 className="mb-5 text-lg font-medium">New category</h2><CategoryFields /></AdminActionForm> : null}</main>;
}
