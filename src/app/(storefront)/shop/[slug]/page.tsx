import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductConfigurator } from "@/components/cart/product-configurator";
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
  };
}

export default async function ProductPage(props: PageProps<"/shop/[slug]">) {
  const { slug } = await props.params;
  const product = await getPublishedProductBySlug(slug);

  if (!product) notFound();

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-16">
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

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:gap-16">
        <div className="grid gap-3 sm:grid-cols-2">
          {product.images.map((image, index) => (
            <div
              className={`relative aspect-[4/5] overflow-hidden bg-[#ded7cb] ${
                index === 0 && product.images.length % 2 === 1
                  ? "sm:col-span-2 sm:aspect-[8/5]"
                  : ""
              }`}
              key={`${image.url}-${index}`}
            >
              <Image
                alt={image.alt}
                className="object-cover"
                fill
                priority={index === 0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 36vw"
                src={image.url}
              />
            </div>
          ))}
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <Link
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a5f42] hover:underline"
            href={`/collections/${product.category.slug}`}
          >
            {product.category.name}
          </Link>
          <h1 className="mt-4 text-4xl font-medium tracking-[-0.045em] sm:text-5xl">
            {product.name}
          </h1>
          <div className="mt-5 flex items-center justify-between gap-4 border-b border-[#20211d]/15 pb-6">
            <p className="text-lg">{product.price}</p>
            <p className="text-sm text-[#20211d]/60">{product.availability}</p>
          </div>
          <p className="mt-7 text-base leading-7 text-[#20211d]/68">
            {product.description}
          </p>

          {product.variants.length > 0 ? (
            <ProductConfigurator variants={product.variants} />
          ) : (
            <p className="mt-10 text-sm text-[#20211d]/60">
              Variant information is not available.
            </p>
          )}

          <aside className="mt-8 border-l-2 border-[#9a5f42] bg-[#faf8f3] px-5 py-4 text-xs leading-5 text-[#20211d]/60">
            Availability is informational and may change. Stock is confirmed
            again during checkout, and adding an item to your bag does not reserve it.
          </aside>
        </div>
      </div>
    </main>
  );
}
