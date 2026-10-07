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
        className="my-10 border-y border-[#20211d]/15 py-4 sm:my-14"
      >
        <ul className="flex flex-wrap gap-x-2 gap-y-1">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                className="inline-flex min-h-11 items-center px-3 text-sm transition-colors hover:text-[#9a5f42]"
                href={`/collections/${category.slug}`}
              >
                {category.name}
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
