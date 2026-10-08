import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";

import { ProductGrid } from "@/components/storefront/product-grid";
import {
  getActiveCategories,
  getPublishedProducts,
} from "@/server/catalogue/catalogue";

export const instant = false;

export default async function HomePage() {
  await connection();

  const [categories, products] = await Promise.all([
    getActiveCategories(),
    getPublishedProducts(6),
  ]);

  return (
    <main>
      <section className="grid min-h-[calc(100svh-5rem)] bg-[#d8cbbb] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-center px-5 py-16 sm:px-8 sm:py-24 lg:px-[max(2.5rem,calc((100vw-80rem)/2))] lg:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6f432f]">
            Autumn study · 2026
          </p>
          <h1 className="mt-6 max-w-3xl text-5xl font-medium leading-[0.94] tracking-[-0.055em] sm:text-7xl lg:text-[6.5rem]">
            Form for everyday living.
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-[#20211d]/68 sm:text-lg sm:leading-8">
            Considered layers, tactile knitwear, and useful objects made for
            an unhurried wardrobe.
          </p>
          <div className="mt-9 grid gap-3 sm:flex sm:flex-wrap">
            <Link
              className="inline-flex min-h-12 items-center justify-center bg-[#20211d] px-6 text-sm font-medium text-white transition-colors hover:bg-[#34463b]"
              href="/shop"
            >
              Shop the catalogue
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center border border-[#20211d]/35 px-6 text-sm font-medium transition-colors hover:bg-white/30"
              href="#collections"
            >
              Explore collections
            </Link>
          </div>
        </div>
        <div className="relative min-h-[54svh] overflow-hidden bg-[#5a6b5e] lg:min-h-full">
          <Image
            alt="A study in olive, clay, and natural tones for the Maison Vale collection"
            className="object-cover"
            fill
            preload
            sizes="(max-width: 1024px) 100vw, 48vw"
            src="/catalogue/photography/maison-vale-editorial-hero.webp"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
        <div className="mb-10 flex flex-col gap-5 border-b border-[#20211d]/15 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a5f42]">
              The current edit
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.035em] sm:text-5xl">
              Pieces in focus
            </h2>
          </div>
          <Link
            className="inline-flex min-h-11 items-center text-sm underline decoration-[#20211d]/25 underline-offset-4 hover:decoration-[#20211d]"
            href="/shop"
          >
            View all products
          </Link>
        </div>
        <ProductGrid products={products} />
      </section>

      <section
        className="border-y border-[#20211d]/15 bg-[#e8e0d5]"
        id="collections"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a5f42]">
            Browse by collection
          </p>
          <div className="mt-8 grid border-t border-[#20211d]/20 sm:grid-cols-2">
            {categories.map((category) => (
              <Link
                className="group min-h-40 border-b border-[#20211d]/20 px-1 py-7 odd:sm:border-r sm:px-6 sm:py-8"
                href={`/collections/${category.slug}`}
                key={category.slug}
              >
                <h2 className="text-2xl font-medium tracking-[-0.03em] sm:text-3xl">
                  {category.name}
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-[#20211d]/60">
                  {category.description ?? "Explore the collection."}
                </p>
                <span className="mt-6 inline-block text-sm underline decoration-[#20211d]/25 underline-offset-4 group-hover:decoration-[#20211d]">
                  View collection
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#34463b] px-5 py-24 text-[#f6f1e9] sm:px-8 sm:py-32 lg:px-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d9c5ae]">
            The Maison Vale approach
          </p>
          <h2 className="mt-6 text-4xl font-medium leading-tight tracking-[-0.045em] sm:text-6xl">
            Less noise. Better materials. A wardrobe with room to breathe.
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-[#f6f1e9]/68">
            We shape familiar pieces with balanced proportions, grounded
            colours, and details that reward daily use.
          </p>
        </div>
      </section>
    </main>
  );
}
