import Image from "next/image";
import Link from "next/link";

import type { ProductCardDto } from "@/server/catalogue/catalogue-core";

export function ProductCard({ product }: { product: ProductCardDto }) {
  return (
    <article className="group min-w-0">
      <Link
        className="block rounded-sm focus-visible:outline-offset-4"
        href={`/shop/${product.slug}`}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-[#ded7cb]">
          <Image
            alt={product.image.alt}
            className="object-cover transition duration-500 ease-out group-hover:scale-[1.025]"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            src={product.image.url}
          />
        </div>
        <div className="flex items-start justify-between gap-4 pt-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.16em] text-[#20211d]/50">
              {product.category.name}
            </p>
            <h2 className="mt-1 text-base font-medium tracking-[-0.01em]">
              {product.name}
            </h2>
          </div>
          <p className="shrink-0 text-sm">{product.price}</p>
        </div>
        <p className="mt-2 text-xs text-[#20211d]/55">
          {product.availability}
        </p>
      </Link>
    </article>
  );
}
