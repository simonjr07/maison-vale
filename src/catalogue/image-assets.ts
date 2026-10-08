export type CatalogueImageAsset = {
  url: string;
  alt: string;
  productSlug: string;
  color: string;
  role: "hero" | "detail";
};

const photography = "/catalogue/photography";

export const CATALOGUE_IMAGE_ASSETS = [
  { url: `${photography}/hearth-overshirt-clay-hero.webp`, alt: "Hearth Overshirt in clay brushed cotton twill", productSlug: "hearth-overshirt", color: "Clay", role: "hero" },
  { url: `${photography}/hearth-overshirt-clay-detail.webp`, alt: "Close view of the Hearth Overshirt collar, buttons, and twill texture", productSlug: "hearth-overshirt", color: "Clay", role: "detail" },
  { url: `${photography}/column-trouser-olive-hero.webp`, alt: "Column Trouser in deep olive wool blend", productSlug: "column-trouser", color: "Olive", role: "hero" },
  { url: `${photography}/column-trouser-olive-detail.webp`, alt: "Close view of the Column Trouser pleat and waistband construction", productSlug: "column-trouser", color: "Olive", role: "detail" },
  { url: `${photography}/ridge-merino-crew-oat-hero.webp`, alt: "Ridge Merino Crew in soft oat merino", productSlug: "ridge-merino-crew", color: "Oat", role: "hero" },
  { url: `${photography}/ridge-merino-crew-oat-detail.webp`, alt: "Close view of the oat Ridge Merino Crew neckline and fine knit", productSlug: "ridge-merino-crew", color: "Oat", role: "detail" },
  { url: `${photography}/ridge-merino-crew-graphite-hero.webp`, alt: "Ridge Merino Crew in graphite merino", productSlug: "ridge-merino-crew", color: "Graphite", role: "hero" },
  { url: `${photography}/ridge-merino-crew-graphite-detail.webp`, alt: "Close view of the graphite Ridge Merino Crew ribbing and fine knit", productSlug: "ridge-merino-crew", color: "Graphite", role: "detail" },
  { url: `${photography}/vale-rib-cardigan-charcoal-hero.webp`, alt: "Vale Rib Cardigan in charcoal knit", productSlug: "vale-rib-cardigan", color: "Charcoal", role: "hero" },
  { url: `${photography}/vale-rib-cardigan-charcoal-detail.webp`, alt: "Close view of the Vale Rib Cardigan ribbing and corozo buttons", productSlug: "vale-rib-cardigan", color: "Charcoal", role: "detail" },
  { url: `${photography}/fold-cardholder-saddle-hero.webp`, alt: "Fold Cardholder in saddle vegetable-tanned leather", productSlug: "fold-cardholder", color: "Saddle", role: "hero" },
  { url: `${photography}/fold-cardholder-saddle-detail.webp`, alt: "Close view of the saddle Fold Cardholder stitching and leather grain", productSlug: "fold-cardholder", color: "Saddle", role: "detail" },
  { url: `${photography}/fold-cardholder-black-hero.webp`, alt: "Fold Cardholder in black vegetable-tanned leather", productSlug: "fold-cardholder", color: "Black", role: "hero" },
  { url: `${photography}/fold-cardholder-black-detail.webp`, alt: "Close view of the black Fold Cardholder stitching and leather grain", productSlug: "fold-cardholder", color: "Black", role: "detail" },
  { url: `${photography}/linea-belt-dark-brown-hero.webp`, alt: "Linea Belt in dark brown leather with a brushed brass buckle", productSlug: "linea-belt", color: "Dark brown", role: "hero" },
  { url: `${photography}/linea-belt-dark-brown-detail.webp`, alt: "Close view of the Linea Belt edge finishing and brass buckle", productSlug: "linea-belt", color: "Dark brown", role: "detail" },
  { url: `${photography}/vale-carryall-natural-hero.webp`, alt: "Vale Carryall in natural structured canvas", productSlug: "vale-carryall", color: "Natural", role: "hero" },
  { url: `${photography}/vale-carryall-natural-detail.webp`, alt: "Close view of the natural Vale Carryall handles and canvas construction", productSlug: "vale-carryall", color: "Natural", role: "detail" },
  { url: `${photography}/vale-carryall-ink-hero.webp`, alt: "Vale Carryall in deep ink canvas", productSlug: "vale-carryall", color: "Ink", role: "hero" },
  { url: `${photography}/vale-carryall-ink-detail.webp`, alt: "Close view of the ink Vale Carryall handles and canvas construction", productSlug: "vale-carryall", color: "Ink", role: "detail" },
  { url: `${photography}/studio-wool-throw-rust-hero.webp`, alt: "Studio Wool Throw in rust", productSlug: "studio-wool-throw", color: "Rust", role: "hero" },
  { url: `${photography}/studio-wool-throw-rust-detail.webp`, alt: "Close view of the rust Studio Wool Throw weave and brushed fringe", productSlug: "studio-wool-throw", color: "Rust", role: "detail" },
  { url: `${photography}/studio-wool-throw-moss-hero.webp`, alt: "Studio Wool Throw in moss", productSlug: "studio-wool-throw", color: "Moss", role: "hero" },
  { url: `${photography}/studio-wool-throw-moss-detail.webp`, alt: "Close view of the moss Studio Wool Throw weave and brushed fringe", productSlug: "studio-wool-throw", color: "Moss", role: "detail" },
] as const satisfies readonly CatalogueImageAsset[];

export const CATALOGUE_IMAGE_OPTIONS = CATALOGUE_IMAGE_ASSETS.map((asset) => asset.url);

export function getCatalogueImageAsset(url: string) {
  return CATALOGUE_IMAGE_ASSETS.find((asset) => asset.url === url);
}

export function imageMatchesVariant(url: string, color: string | null) {
  const asset = getCatalogueImageAsset(url);
  return Boolean(asset && color && asset.color.toLocaleLowerCase() === color.toLocaleLowerCase());
}
