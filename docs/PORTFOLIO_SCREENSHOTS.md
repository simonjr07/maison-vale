# Maison Vale portfolio screenshot register

Nine supplied screenshots from the deployed portfolio sandbox have passed the publication privacy review and are stored in `docs/screenshots/`. One requested category remains missing and is not referenced from public documentation. Do not publish administrator credentials, customer email, full address, order reference, Stripe identifiers, database details, browser storage, logs, or internal diagnostic notes.

## Capture standards

- The accepted desktop captures retain their supplied 1920 × 1080 PNG dimensions.
- The accepted mobile homepage retains its supplied 388 × 775 PNG dimensions.
- Future replacement captures should use a consistent desktop or mobile viewport and retain an original PNG for review.
- Keep the interface authentic. Cropping and resizing are acceptable; adding products, orders, metrics, success states, or test results in an editor is not.
- Use fictional, non-reusable data and redact from a copy when a real sandbox record is required.
- Capture visible focus only when documenting keyboard behavior. Keep browser extensions, unrelated tabs, account avatars, and desktop notifications out of frame.

## Supplied screenshot disposition

| Requested filename | Status | Content and review result |
|---|---|---|
| `01-homepage-desktop.png` | Integrated | Desktop editorial homepage; privacy review passed |
| `02-homepage-mobile.png` | Integrated | Mobile editorial homepage; privacy review passed |
| `03-product-catalogue.png` | Stored | Public catalogue grid; privacy review passed |
| `04-product-details.png` | Integrated | Vale Carryall details, variants, stock, and add-to-bag action; privacy review passed |
| `05-shopping-cart.png` | Integrated | Guest shopping bag and checkout action; privacy review passed |
| `06-checkout.png` | Integrated | Stripe sandbox Checkout; customer email is covered by an irreversible opaque publication redaction |
| `07-order-confirmation.png` | Missing | The supplied order-related image is the guest lookup form, not an order-confirmation screen; it was not renamed or published |
| `08-admin-dashboard.png` | Integrated | Administrative analytics; administrator email is covered by an irreversible opaque publication redaction |
| `09-admin-products.png` | Integrated | Administrative product catalogue; privacy review passed |
| `10-admin-inventory.png` | Stored | Administrative inventory; administrator email is covered by an irreversible opaque publication redaction |

One additional mobile product-detail image was supplied. It was not copied because the desktop product detail already fills the requested category and retaining both would add an unnecessary duplicate.

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

- README: the desktop homepage leads the project, followed by a compact selection covering product details, the bag, sandbox checkout, and administrative analytics.
- `docs/PORTFOLIO_CASE_STUDY.md`: selected storefront, product, bag, checkout, and analytics captures support the corresponding engineering narrative.
- External portfolio: lead with the home image, then product, checkout, order, and administration. Keep technical evidence in a separate process or engineering section.

Do not add a Markdown image reference for `07-order-confirmation.png` until an authentic confirmation capture exists. Missing-image placeholders can be mistaken for verified evidence.

## Capture QA

- Confirm the production URL, date, and exact Git revision.
- Check 320 px, 390 px, tablet, desktop, and 200% zoom before selecting publication captures.
- Navigate each captured flow with a keyboard and confirm focus remains visible.
- Check reduced-motion behavior and screen-reader names for gallery and form controls.
- Inspect all corners at full resolution for PII, credentials, provider identifiers, browser UI, and unrelated content.
- Confirm the copy says sandbox or test mode wherever payment or analytics state appears.
- Add concise alt text and a factual caption; do not claim traffic, revenue, conversion, scale, or client outcomes.

## Capture register

| Filename | Dimensions | Environment and state | Revision/date | Privacy review |
|---|---:|---|---|---|
| `01-homepage-desktop.png` | 1920 × 1080 | Deployed sandbox, desktop homepage | Not supplied | Passed |
| `02-homepage-mobile.png` | 388 × 775 | Deployed sandbox, mobile homepage | Not supplied | Passed |
| `03-product-catalogue.png` | 1920 × 1080 | Deployed sandbox, public catalogue | Not supplied | Passed |
| `04-product-details.png` | 1920 × 1080 | Deployed sandbox, Vale Carryall details | Not supplied | Passed |
| `05-shopping-cart.png` | 1920 × 1080 | Deployed sandbox, guest bag | Not supplied | Passed |
| `06-checkout.png` | 1920 × 1080 | Stripe-hosted sandbox Checkout | Not supplied | Passed after opaque email redaction |
| `08-admin-dashboard.png` | 1920 × 1080 | Deployed sandbox, administrative analytics | Not supplied | Passed after opaque email redaction |
| `09-admin-products.png` | 1920 × 1080 | Deployed sandbox, administrative catalogue | Not supplied | Passed |
| `10-admin-inventory.png` | 1920 × 1080 | Deployed sandbox, administrative inventory | Not supplied | Passed after opaque email redaction |
