# Maison Vale portfolio screenshot plan

No screenshot in this plan is evidence until it has been captured from the verified deployment, reviewed at full resolution, and entered in the capture register. Do not publish administrator credentials, customer email, full address, order reference, Stripe identifiers, database details, browser storage, logs, or internal diagnostic notes.

## Capture standards

- Desktop: 1440 × 1000 CSS pixels at 100% zoom.
- Mobile: 390 × 844 CSS pixels at 100% zoom; add a 320 px QA capture when checking minimum-width behavior.
- Prefer WebP for the public portfolio and retain original PNG captures privately.
- Keep the interface authentic. Cropping and resizing are acceptable; adding products, orders, metrics, success states, or test results in an editor is not.
- Use fictional, non-reusable data and redact from a copy when a real sandbox record is required.
- Capture visible focus only when documenting keyboard behavior. Keep browser extensions, unrelated tabs, account avatars, and desktop notifications out of frame.

## Recommended public gallery

| Filename | Route and state | Viewport | What it demonstrates |
|---|---|---:|---|
| `01-maison-vale-home-desktop.webp` | `/` editorial opening | Desktop | Brand direction, navigation, hero hierarchy, and primary action |
| `02-maison-vale-shop-desktop.webp` | `/shop` with collection controls and first product row | Desktop | Catalogue structure, responsive controls, and product presentation |
| `03-maison-vale-product-desktop.webp` | A multi-colour product with an available variant | Desktop | Gallery, variant selection, price, stock message, and add-to-bag action |
| `04-maison-vale-product-added-mobile.webp` | Product detail after adding one item | Mobile | Touch layout, live confirmation, and the View bag action |
| `05-maison-vale-cart-desktop.webp` | `/cart` with two fictional items | Desktop | Quantity controls, authoritative summary, and checkout path |
| `06-maison-vale-checkout-mobile.webp` | `/checkout` before payment submission | Mobile | Guest form, labels, summary, validation design, and sandbox context |
| `07-maison-vale-order-lookup-desktop.webp` | `/orders` empty form | Desktop | Privacy explanation and lightweight guest verification flow |
| `08-maison-vale-order-details-desktop.webp` | Authorized fictional sandbox order | Desktop | Recorded items, masked destination, truthful payment and fulfillment states |
| `09-maison-vale-admin-analytics-desktop.webp` | `/admin` with sanitized sandbox data | Desktop | KPI definitions, trend, variant ranking, and stock alerts |
| `10-maison-vale-admin-catalogue-desktop.webp` | `/admin/products` or a product detail | Desktop | Searchable catalogue and role-aware operational UI |
| `11-maison-vale-admin-inventory-desktop.webp` | `/admin/inventory` | Desktop | Current stock, adjustment workflow, and movement history |
| `12-maison-vale-admin-order-desktop.webp` | One sanitized admin order detail | Desktop | Verified payment state, fulfillment controls, and status history |

For the public order screenshot, mask the complete order reference in the published image even though the public DTO already masks the destination. For administrator screenshots, use a sanitized fictional record and remove email, full address, internal UUIDs, provider identifiers, and diagnostic details from the publication copy.

## Private evidence captures

Keep these outside the public gallery and redact identifiers before sharing with a reviewer:

- Vercel production deployment and revision
- Hosted QA terminal result
- Security-header response summary
- CI and local verification summary
- Prisma migration status showing five applied migrations without a database host
- Stripe sandbox webhook delivery status without event, session, payment, or customer identifiers
- Neon record summary showing only safe statuses, movement count/delta, and exception absence
- Accessibility results, cookie flags, backup policy, alert configuration, and rollback exercise

## Placement

- README: use the home desktop image after the introduction and a compact row of product, cart, and analytics images after the capabilities section only after captures exist.
- `docs/PORTFOLIO_CASE_STUDY.md`: place storefront imagery after “Solution,” the order-details image after “Privacy and security model,” and the sanitized analytics image before “Demonstrated results.”
- External portfolio: lead with the home image, then product, checkout, order, and administration. Keep technical evidence in a separate process or engineering section.

Do not add Markdown image references until the corresponding files exist. Missing-image placeholders can be mistaken for verified evidence.

## Capture QA

- Confirm the production URL, date, and exact Git revision.
- Check 320 px, 390 px, tablet, desktop, and 200% zoom before selecting publication captures.
- Navigate each captured flow with a keyboard and confirm focus remains visible.
- Check reduced-motion behavior and screen-reader names for gallery and form controls.
- Inspect all corners at full resolution for PII, credentials, provider identifiers, browser UI, and unrelated content.
- Confirm the copy says sandbox or test mode wherever payment or analytics state appears.
- Add concise alt text and a factual caption; do not claim traffic, revenue, conversion, scale, or client outcomes.

## Capture register

| Filename | Environment | Route/state | Revision | Date | Privacy review |
|---|---|---|---|---|---|
| Not captured | — | — | — | — | Pending |
