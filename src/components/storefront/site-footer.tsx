import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#f8f4ed]/20 bg-[#20211d] text-[#f8f4ed]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-2 lg:px-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em]">
            Maison Vale
          </p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#f8f4ed]/65">
            Quietly expressive pieces shaped for repeat wear and everyday use.
          </p>
        </div>
        <div className="md:text-right">
          <div className="flex flex-wrap gap-x-6 md:justify-end">
            <Link className="inline-flex min-h-11 items-center text-sm underline decoration-[#f8f4ed]/35 underline-offset-4 hover:decoration-[#f8f4ed]" href="/shop">Browse the catalogue</Link>
            <Link className="inline-flex min-h-11 items-center text-sm underline decoration-[#f8f4ed]/35 underline-offset-4 hover:decoration-[#f8f4ed]" href="/orders">Find an order</Link>
          </div>
          <p className="mt-5 text-xs uppercase tracking-[0.18em] text-[#f8f4ed]/45">
            Fictional portfolio storefront
          </p>
        </div>
      </div>
    </footer>
  );
}
