import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { buildSitemap, canonicalPublicOrigin } from "@/seo/metadata-routes";
import { getActiveCategories, getPublishedProducts } from "@/server/catalogue/catalogue";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [categories, products] = await Promise.all([
    getActiveCategories(),
    getPublishedProducts(),
  ]);

  return buildSitemap(
    canonicalPublicOrigin(process.env.APP_URL),
    categories,
    products,
  );
}
