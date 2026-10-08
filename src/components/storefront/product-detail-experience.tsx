"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ProductConfigurator } from "@/components/cart/product-configurator";
import { getInitialVariantId } from "@/components/cart/product-configurator-state";
import type { ProductDetailDto } from "@/server/catalogue/catalogue-core";

import { ProductGallery } from "./product-gallery";

export function ProductDetailExperience({ product }: { product: ProductDetailDto }) {
  const initialVariantId = useMemo(() => getInitialVariantId(product.variants), [product.variants]);
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);
  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId);
  const galleryImages = selectedVariant?.images ?? product.images;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:gap-16">
      <ProductGallery key={selectedVariant?.color ?? "product"} images={galleryImages} productName={product.name} />

      <div className="lg:sticky lg:top-8 lg:self-start">
        <Link className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a5f42] hover:underline" href={`/collections/${product.category.slug}`}>
          {product.category.name}
        </Link>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.045em] sm:text-5xl">{product.name}</h1>
        <div className="mt-5 flex items-center justify-between gap-4 border-b border-[#20211d]/15 pb-6">
          <p className="text-lg">{selectedVariant?.price ?? product.price}</p>
          <p className="text-sm text-[#20211d]/60">{selectedVariant?.stockMessage ?? product.availability}</p>
        </div>
        <p className="mt-7 text-base leading-7 text-[#20211d]/68">{product.description}</p>

        {product.variants.length > 0 ? (
          <ProductConfigurator variants={product.variants} selectedVariantId={selectedVariantId} onVariantChange={setSelectedVariantId} />
        ) : (
          <p className="mt-10 text-sm text-[#20211d]/60">Variant information is not available.</p>
        )}

        <aside className="mt-8 border-l-2 border-[#9a5f42] bg-[#faf8f3] px-5 py-4 text-xs leading-5 text-[#20211d]/60">
          Availability is informational and may change. Stock is confirmed again during checkout, and adding an item to your bag does not reserve it.
        </aside>
      </div>
    </div>
  );
}
