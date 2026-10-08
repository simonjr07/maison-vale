# Catalogue image assets

TASK-013 adds a complete local photography set for the eight public seeded products. The 24 product photographs cover all 12 visually distinct colourways with one hero and one detail view each. One additional landscape still life supports the homepage. Size-only variants reuse the gallery for their colour.

## Provenance and usage

The images were generated for this fictional portfolio storefront with OpenAI image generation on 8 October 2026. They depict fictional Maison Vale products and contain no third-party marks, people, customer data, embedded text, or watermarks. Generated PNG masters remain outside the repository in the local Codex generated-images archive. Repository copies are encoded as WebP at quality 82 under `public/catalogue/photography` for responsive delivery through `next/image`.

The common product prompt direction was: “Premium editorial ecommerce product photograph of the specified Maison Vale product and colourway, shown alone in a warm limestone studio, centered 4:5 composition, soft directional daylight, restrained shadows, honest material texture and construction, quiet luxury palette, no person, styling props, text, logo, watermark, or border.” Detail prompts requested a close construction view of the material, seams, fastenings, and relevant craft details. The editorial prompt requested a 3:2 warm-limestone still life containing the clay Hearth Overshirt, olive Column Trouser, oat Ridge Merino Crew, and natural Vale Carryall, with calm negative space and no people or text.

## Asset inventory

| Product | Colourways | Files per colour |
|---|---|---|
| Hearth Overshirt | Clay | `hero`, `detail` |
| Column Trouser | Olive | `hero`, `detail` |
| Ridge Merino Crew | Oat, Graphite | `hero`, `detail` |
| Vale Rib Cardigan | Charcoal | `hero`, `detail` |
| Fold Cardholder | Saddle, Black | `hero`, `detail` |
| Linea Belt | Dark brown | `hero`, `detail` |
| Vale Carryall | Natural, Ink | `hero`, `detail` |
| Studio Wool Throw | Rust, Moss | `hero`, `detail` |

File names follow `{product-slug}-{colour-slug}-{hero|detail}.webp`. The homepage asset is `maison-vale-editorial-hero.webp`.

## Maintenance

`src/catalogue/image-assets.ts` is the canonical presentation manifest and admin allow-list source. `prisma/seed.mjs` stores the same ordered URLs and alternative text in PostgreSQL. When replacing an image, keep the product and colour metadata aligned, write useful non-repetitive alternative text, optimize the file before review, update both locations, run the idempotent seed, and execute the catalogue unit and PostgreSQL integration checks. Do not accept arbitrary remote URLs or treat image metadata as commerce authority.
