import { describe, expect, it } from "vitest";

import { buildRobots, buildSitemap, canonicalPublicOrigin } from "./metadata-routes";

describe("public metadata routes", () => {
  it("uses only the canonical origin", () => {
    expect(canonicalPublicOrigin("https://shop.example/path?ignored=true")).toBe("https://shop.example");
  });

  it("excludes private and transactional surfaces from crawling", () => {
    const robots = buildRobots("https://shop.example");
    expect(robots.rules).toMatchObject({
      allow: "/",
      disallow: expect.arrayContaining(["/admin", "/api", "/checkout", "/orders"]),
    });
  });

  it("publishes only storefront catalogue URLs", () => {
    const entries = buildSitemap(
      "https://shop.example",
      [{ slug: "knitwear" }],
      [{ slug: "ridge-crew" }],
    );
    expect(entries.map((entry) => entry.url)).toEqual([
      "https://shop.example",
      "https://shop.example/shop",
      "https://shop.example/collections/knitwear",
      "https://shop.example/shop/ridge-crew",
    ]);
    expect(entries.some((entry) => entry.url.includes("admin"))).toBe(false);
  });
});
