import type { ProductCardDto } from "@/server/catalogue/catalogue-core";

import { ProductCard } from "./product-card";

export function ProductGrid({ products }: { products: ProductCardDto[] }) {
  return (
    <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-7 lg:gap-y-16">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}
