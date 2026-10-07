import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGrid } from "@/components/storefront/product-grid";
import { getPublishedProductsByCategory } from "@/server/catalogue/catalogue";

export const instant = false;

export async function generateMetadata(
  props: PageProps<"/collections/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const result = await getPublishedProductsByCategory(slug);

  if (!result) return { title: "Collection not found" };

  return {
    title: result.category.name,
    description:
      result.category.description ??
      `Browse the ${result.category.name} collection from Maison Vale.`,
  };
}

export default async function CollectionPage(
  props: PageProps<"/collections/[slug]">,
) {
  const { slug } = await props.params;
  const result = await getPublishedProductsByCategory(slug);

  if (!result) notFound();

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
      <nav aria-label="Breadcrumb" className="text-xs text-[#20211d]/55">
        <ol className="flex items-center gap-2">
          <li>
            <Link className="underline underline-offset-4" href="/shop">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{result.category.name}</li>
        </ol>
      </nav>

      <header className="mt-10 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a5f42]">
          Collection
        </p>
        <h1 className="mt-4 text-5xl font-medium tracking-[-0.05em] sm:text-7xl">
          {result.category.name}
        </h1>
        {result.category.description ? (
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#20211d]/62 sm:text-lg">
            {result.category.description}
          </p>
        ) : null}
      </header>

      <div className="mt-12 border-t border-[#20211d]/15 pt-10 sm:mt-16 sm:pt-14">
        {result.products.length > 0 ? (
          <ProductGrid products={result.products} />
        ) : (
          <div className="bg-[#faf8f3] px-6 py-16 text-center">
            <h2 className="text-2xl font-medium">Nothing here just yet.</h2>
            <p className="mt-3 text-sm leading-6 text-[#20211d]/60">
              This collection has no published pieces at the moment.
            </p>
            <Link
              className="mt-6 inline-flex min-h-11 items-center underline underline-offset-4"
              href="/shop"
            >
              Browse all products
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
