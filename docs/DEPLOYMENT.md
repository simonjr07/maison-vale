# Deployment

## Intended topology

Local development uses Next.js with the PostgreSQL 17 service in `compose.yaml`, exposed on host port 5435. Production remains planned for Vercel, Supabase PostgreSQL, and Stripe.

Likely configuration responsibilities:

- `DATABASE_URL`: runtime application connection used by the PostgreSQL driver adapter.
- `DIRECT_URL`: direct Prisma CLI and migration connection.
- `AUTH_SECRET`: server-only session/authentication secret.
- `RATE_LIMIT_SECRET`: server-only HMAC key for login rate-limit identities.
- `APP_URL`: trusted application origin used for Stripe return URLs.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: local-only inputs for the explicit provisioning command; they should not remain set in hosted runtime environments.
- `STRIPE_SECRET_KEY`: server-only Stripe test API credential; TASK-008 rejects live keys.
- `STRIPE_WEBHOOK_SECRET`: server-only endpoint secret from Stripe CLI or Dashboard.
- Public Stripe publishable key: browser-safe key only if the chosen checkout flow needs it.

`.env.example` contains local-only development examples and blank future-secret placeholders. Real values belong in ignored local environment files or hosted secret stores.

Production must provide strong, independent `AUTH_SECRET` and `RATE_LIMIT_SECRET` values. Rotating `AUTH_SECRET` invalidates existing sessions. Provision administrative accounts through a controlled one-off environment or local direct database connection, never through a public route.

Start the local database with `docker compose up -d db`, then run generation, migration, status, seed, and smoke scripts from `package.json`. Production migrations must be reviewed and applied as an explicit deployment step; destructive resets are not part of the deployment workflow. Hosted QA should eventually verify payments, webhooks, order state, inventory behavior, responsive layout, and accessibility.

For local webhook QA, run the application and use Stripe CLI forwarding to `http://localhost:3000/api/stripe/webhook`, then set the listener's `whsec_` value in the ignored `.env`. Missing payment configuration fails only payment routes; unrelated storefront pages continue to run. Pending orders abandoned before payment are retained for audit and require a future expiry or cleanup job. Production activation is explicitly outside TASK-008.

Stripe CLI forwarding is not retroactive: start the listener before opening Checkout. A later `stripe trigger checkout.session.completed` creates a different synthetic Session and may correctly produce `UNKNOWN_SESSION`. Use the redacted payment diagnostic to distinguish that outcome. The explicit sandbox reconciliation command can recover a missed real test event only after authenticated Stripe API checks pass; it is disabled in production and cannot create a payment or infer payment from the browser redirect.
