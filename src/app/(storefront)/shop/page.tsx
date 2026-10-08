import type { Metadata } from "next";
import Link from "next/link";

import { ProductGrid } from "@/components/storefront/product-grid";
import {
  getActiveCategories,
  getPublishedProducts,
} from "@/server/catalogue/catalogue";

export const instant = false;

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse the complete Maison Vale catalogue.",
};

export default async function ShopPage() {
  const [categories, products] = await Promise.all([
    getActiveCategories(),
    getPublishedProducts(),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a5f42]">
          The full catalogue
        </p>
        <h1 className="mt-4 text-5xl font-medium tracking-[-0.05em] sm:text-7xl">
          Shop
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#20211d]/62 sm:text-lg">
          Considered clothing and practical objects, selected to work together
          and settle naturally into daily life.
        </p>
      </header>

      <nav
        aria-label="Shop by collection"
        className="my-10 border-y border-[#20211d]/15 py-6 sm:my-14 sm:py-7"
      >
        <ul className="grid gap-3 min-[430px]:grid-cols-2 md:flex md:flex-wrap">
          {categories.map((category) => (
            <li className="md:flex" key={category.slug}>
              <Link
                className="group inline-flex min-h-11 w-full items-center justify-between gap-4 rounded-full border border-[#20211d]/20 bg-[#faf8f3] px-5 py-2.5 text-sm font-medium shadow-[0_1px_0_rgba(32,33,29,0.04)] transition-[background-color,border-color,color,transform] hover:-translate-y-0.5 hover:border-[#20211d] hover:bg-[#20211d] hover:text-white md:w-auto"
                href={`/collections/${category.slug}`}
              >
                <span>{category.name}</span>
                <span
                  aria-hidden="true"
                  className="text-base text-[#9a5f42] transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <div className="border border-[#20211d]/15 bg-[#faf8f3] px-6 py-16 text-center">
          <h2 className="text-2xl font-medium">The catalogue is being prepared.</h2>
          <p className="mt-3 text-sm leading-6 text-[#20211d]/60">
            Please return soon to explore the first Maison Vale collection.
          </p>
        </div>
      )}
    </main>
  );
}
