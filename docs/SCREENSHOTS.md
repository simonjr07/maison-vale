# Portfolio screenshot plan

No final portfolio screenshots have been captured yet. Capture them only from a verified deployment or from a clearly labelled local environment. Use fictional catalogue and customer details, and never show credentials, provider identifiers, browser storage, full addresses, email search terms, logs, or internal diagnostic notes.

## Capture standards

- Desktop viewport: 1440 × 1000 CSS pixels at 100% zoom.
- Mobile viewport: 390 × 844 CSS pixels at 100% zoom.
- Use WebP or PNG, retain the original capture, and create presentation crops from a copy.
- Keep browser chrome out of portfolio crops unless the URL itself is needed as evidence.
- Avoid transient loading states, focus rings caused only by capture tooling, mouse cursors over copy, and clipped headings.
- Preserve real UI state. Cropping, resizing, and light exposure correction are acceptable; adding products, orders, metrics, or success states in an editor is not.
- Use descriptive lowercase names such as `01-home-desktop.webp` and record the source route and date below.

## Required portfolio set

| File | Route and state | Composition |
|---|---|---|
| `01-home-desktop.webp` | `/` | Editorial hero, primary call to action, and enough navigation context to establish the brand. |
| `02-shop-desktop.webp` | `/shop` | Shop introduction, polished collection controls, and the first product row. |
| `03-product-gallery-desktop.webp` | One seeded multi-colour product | Hero and detail photography, selected variant, price, stock message, and add-to-bag control. |
| `04-cart-desktop.webp` | `/cart` with two fictional items | Quantity controls, authoritative totals, and checkout action without personal data. |
| `05-checkout-desktop.webp` | `/checkout` before submission | Guest fields, order summary, sandbox disclosure, and validation design. Use obviously fictional details if fields are populated. |
| `06-order-confirmation-desktop.webp` | Verified sandbox-paid order | Customer-safe confirmation or lookup details with the reference and destination masked in the published image. |
| `07-admin-analytics-desktop.webp` | `/admin` | Sandbox notice, period controls, KPI cards, trend, top variants, and inventory alerts. |
| `08-admin-catalogue-desktop.webp` | `/admin/products` or product detail | Search/list presentation and a representative product or variant operation. |
| `09-admin-inventory-desktop.webp` | `/admin/inventory` | Current stock, movement context, and clear operational hierarchy. |
| `10-admin-orders-desktop.webp` | `/admin/orders` and one detail view | Order search/list plus verified fulfillment controls; redact contact and address data. |
| `11-home-mobile.webp` | `/` at 390 px | Header, hero hierarchy, image crop, and primary action. |
| `12-product-mobile.webp` | Product detail at 390 px | Gallery controls, variant selector, stock state, and add-to-bag feedback. |

## Evidence captures kept outside the public gallery

Retain redacted evidence for the Vercel deployment result, `deployment:check`, migration status, CI, Stripe event delivery with HTTP status, security headers, robots and sitemap responses, accessibility checks, and Neon backup settings. These captures support the case study but should not expose project ids, database hosts, event ids, account email addresses, or secret names paired with values.

## QA before publishing

- Confirm every screenshot is from the recorded revision and environment.
- Check that no live-payment language appears; the interface and caption must say sandbox or simulated payment where relevant.
- Inspect all corners at full resolution for PII, tokens, provider ids, browser extensions, and unrelated desktop content.
- Verify mobile captures have no horizontal clipping at 390 px and that desktop crops preserve intentional spacing.
- Add concise alt text and a one-sentence evidence caption when placing images in the README or portfolio.

## Capture record

| File | Environment | Route | Revision | Date | Verified by |
|---|---|---|---|---|---|
| Pending | Not captured | — | — | — | — |
