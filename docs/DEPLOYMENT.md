# Deployment

## Intended topology

Local development uses Next.js with the PostgreSQL 17 service in `compose.yaml`, exposed on host port 5435. Production remains planned for Vercel, Supabase PostgreSQL, and Stripe.

Likely configuration responsibilities:

- `DATABASE_URL`: runtime application connection used by the PostgreSQL driver adapter.
- `DIRECT_URL`: direct Prisma CLI and migration connection.
- `AUTH_SECRET`: server-only session/authentication secret.
- `RATE_LIMIT_SECRET`: server-only HMAC key for login rate-limit identities.
- `ORDER_LOOKUP_SECRET`: recommended independent server-only key for guest lookup sessions and proof comparison. When omitted, the application uses domain-separated `AUTH_SECRET` as a compatibility fallback.
- `APP_URL`: trusted application origin used for Stripe return URLs.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: local-only inputs for the explicit provisioning command; they should not remain set in hosted runtime environments.
- `STRIPE_SECRET_KEY`: server-only Stripe test API credential; TASK-008 rejects live keys.
- `STRIPE_WEBHOOK_SECRET`: server-only endpoint secret from Stripe CLI or Dashboard.
- Public Stripe publishable key: browser-safe key only if the chosen checkout flow needs it.

`.env.example` contains local-only development examples and blank future-secret placeholders. Real values belong in ignored local environment files or hosted secret stores.

Production must provide strong, independent `AUTH_SECRET`, `RATE_LIMIT_SECRET`, and `ORDER_LOOKUP_SECRET` values. Rotating `AUTH_SECRET` invalidates administrative sessions; rotating the order lookup secret invalidates short-lived guest lookup sessions. Provision administrative accounts through a controlled one-off environment or local direct database connection, never through a public route.

Catalogue management requires no new environment values or storage service. Product images are selected from reviewed, optimized files deployed under `public/catalogue/photography`; adding or replacing an asset requires code review, an update to the asset manifest and admin allow-list, and an idempotent seed run. Confirm ADMIN and STAFF role assignments before hosted QA because STAFF access is intentionally read-only. Production should set `APP_URL` to the canonical HTTPS origin so absolute social metadata resolves correctly.

Order administration requires no new environment values or schema migration. Hosted QA must verify that STAFF can read but cannot submit fulfillment changes, ADMIN transitions require verified paid orders, customer-email searches do not appear in URLs, and admin pages carry noindex behavior. Operational teams must understand that `SHIPPED` and `DELIVERED` are manual confirmations only; do not use this workflow as evidence of carrier acceptance or delivery. Production carrier/tracking and refund procedures remain unresolved launch requirements.

Analytics requires no new environment value or migration. Hosted QA should compare one known paid test order and one persisted test refund against the 7-day and all-time views, confirm pending and failed payments remain excluded, confirm STAFF can read the dashboard, and verify that inventory alerts link to the matching administrative inventory record. The sandbox notice must remain visible while the Stripe adapter is test-mode only. Financial periods use UTC, so QA near a local-day boundary should compare against UTC dates.

TASK-013 hosted QA should verify every seeded colour selection changes to the matching gallery, every image returns successfully through the production image optimizer, checkout and order pages remain noindex, and the storefront remains usable at 320 px and 200% zoom. Run a keyboard and screen-reader smoke test and confirm reduced-motion preferences suppress decorative transitions before capturing portfolio evidence.

Start the local database with `docker compose up -d db`, then run generation, migration, status, seed, and smoke scripts from `package.json`. Production migrations must be reviewed and applied as an explicit deployment step; destructive resets are not part of the deployment workflow. Hosted QA should eventually verify payments, webhooks, order state, inventory behavior, responsive layout, and accessibility.

For local webhook QA, run the application and use Stripe CLI forwarding to `http://localhost:3000/api/stripe/webhook`, then set the listener's `whsec_` value in the ignored `.env`. Missing payment configuration fails only payment routes; unrelated storefront pages continue to run. Pending orders abandoned before payment are retained for audit and require a future expiry or cleanup job. Production activation is explicitly outside TASK-008.

Stripe CLI forwarding is not retroactive: start the listener before opening Checkout. A later `stripe trigger checkout.session.completed` creates a different synthetic Session and may correctly produce `UNKNOWN_SESSION`. Use the redacted payment diagnostic to distinguish that outcome. The explicit sandbox reconciliation command can recover a missed real test event only after authenticated Stripe API checks pass; it is disabled in production and cannot create a payment or infer payment from the browser redirect.

Production order lookup depends on HTTPS for Secure cookies and on a trusted proxy that supplies normalized client-address headers. Rate-limit bucket cleanup remains scheduled operational work. Stronger email ownership verification requires a future transactional email provider; no email code or magic link is implied by the current guest flow.
