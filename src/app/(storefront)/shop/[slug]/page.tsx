import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductDetailExperience } from "@/components/storefront/product-detail-experience";
import { getPublishedProductBySlug } from "@/server/catalogue/catalogue";

export const instant = false;

export async function generateMetadata(
  props: PageProps<"/shop/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getPublishedProductBySlug(slug);

  if (!product) return { title: "Product not found" };

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.image.url === "/catalogue/fallback.svg" ? [] : [{ url: product.image.url, alt: product.image.alt }],
    },
  };
}

export default async function ProductPage(props: PageProps<"/shop/[slug]">) {
  const { slug } = await props.params;
  const product = await getPublishedProductBySlug(slug);

  if (!product) notFound();

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-16">
      <Link
        className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#20211d]/25 bg-[#faf8f3] px-4 text-sm font-medium transition-colors hover:border-[#20211d] hover:bg-[#20211d] hover:text-white"
        href="/shop"
      >
        <span aria-hidden="true">←</span>
        Back to shop
      </Link>
      <nav aria-label="Breadcrumb" className="mb-8 text-xs text-[#20211d]/55">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link className="underline underline-offset-4" href="/shop">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              className="underline underline-offset-4"
              href={`/collections/${product.category.slug}`}
            >
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <ProductDetailExperience product={product} />
    </main>
  );
}
