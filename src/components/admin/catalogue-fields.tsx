import { CATALOGUE_IMAGE_OPTIONS } from "@/server/admin/catalogue-domain";

export const fieldClass = "mt-2 w-full border border-[#25231f]/20 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#9a5f42]";
export const labelClass = "text-sm font-medium text-[#25231f]";

export type CategoryOption = { id: string; name: string };

export function ProductFields({ product, categories }: {
  product?: { name: string; slug: string; description: string; categoryId: string; active: boolean; published: boolean; images: Array<{ url: string; altText: string }> };
  categories: CategoryOption[];
}) {
  const image = product?.images[0];
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>Product name<input className={fieldClass} name="name" defaultValue={product?.name} required maxLength={180} /></label>
        <label className={labelClass}>URL slug<input className={fieldClass} name="slug" defaultValue={product?.slug} required maxLength={200} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
      </div>
      <label className={labelClass}>Description<textarea className={`${fieldClass} min-h-32 resize-y`} name="description" defaultValue={product?.description} required minLength={20} maxLength={5000} /></label>
      <label className={labelClass}>Category<select className={fieldClass} name="categoryId" defaultValue={product?.categoryId} required><option value="">Select a category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>Curated image<select className={fieldClass} name="imageUrl" defaultValue={image?.url ?? ""}><option value="">No image</option>{CATALOGUE_IMAGE_OPTIONS.map((url) => <option value={url} key={url}>{url.replace("/catalogue/", "")}</option>)}</select></label>
        <label className={labelClass}>Image alternative text<input className={fieldClass} name="imageAlt" defaultValue={image?.altText ?? ""} maxLength={240} /></label>
      </div>
      <p className="-mt-2 text-xs leading-5 text-[#25231f]/55">Images are selected from reviewed local assets. Uploads and external image URLs are intentionally unavailable.</p>
      <div className="flex flex-wrap gap-6 border-t border-[#25231f]/10 pt-5">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={product?.active ?? true} /> Active</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={product?.published ?? false} /> Published to storefront</label>
      </div>
    </div>
  );
}

export function VariantFields({ variant, prefix = "" }: {
  variant?: { sku: string; name: string; size: string | null; color: string | null; priceCents: number; compareAtPriceCents: number | null; active: boolean };
  prefix?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className={labelClass}>SKU<input className={fieldClass} name={`${prefix}sku`} defaultValue={variant?.sku} required maxLength={80} /></label>
      <label className={labelClass}>Variant name<input className={fieldClass} name={`${prefix}name`} defaultValue={variant?.name} required maxLength={140} /></label>
      <label className={labelClass}>Size<input className={fieldClass} name={`${prefix}size`} defaultValue={variant?.size ?? ""} maxLength={40} /></label>
      <label className={labelClass}>Color<input className={fieldClass} name={`${prefix}color`} defaultValue={variant?.color ?? ""} maxLength={80} /></label>
      <label className={labelClass}>Price in cents<input className={fieldClass} name={`${prefix}priceCents`} type="number" min={0} max={100000000} step={1} defaultValue={variant?.priceCents} required /></label>
      <label className={labelClass}>Comparison price in cents<input className={fieldClass} name={`${prefix}compareAtPriceCents`} type="number" min={0} max={100000000} step={1} defaultValue={variant?.compareAtPriceCents ?? ""} /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3"><input type="checkbox" name={`${prefix}active`} defaultChecked={variant?.active ?? true} /> Active variant</label>
    </div>
  );
}
