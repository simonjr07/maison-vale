import type { MetadataRoute } from "next";

type SlugRecord = { slug: string };

export function canonicalPublicOrigin(appUrl: string | undefined) {
  const parsed = new URL(appUrl?.trim() || "http://localhost:3000");
  return parsed.origin;
}

export function buildRobots(origin: string): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/cart", "/checkout", "/orders"],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}

export function buildSitemap(
  origin: string,
  categories: readonly SlugRecord[],
  products: readonly SlugRecord[],
): MetadataRoute.Sitemap {
  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/shop`, changeFrequency: "weekly", priority: 0.9 },
    ...categories.map((category) => ({
      url: `${origin}/collections/${category.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: `${origin}/shop/${product.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
