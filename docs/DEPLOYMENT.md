# Deployment

## Intended topology

Local development uses Next.js with the PostgreSQL 17 service in `compose.yaml`, exposed on host port 5435. Production remains planned for Vercel, Supabase PostgreSQL, and Stripe.

Likely configuration responsibilities:

- `DATABASE_URL`: runtime application connection used by the PostgreSQL driver adapter.
- `DIRECT_URL`: direct Prisma CLI and migration connection.
- `AUTH_SECRET`: server-only session/authentication secret.
- `RATE_LIMIT_SECRET`: server-only HMAC key for login rate-limit identities.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: local-only inputs for the explicit provisioning command; they should not remain set in hosted runtime environments.
- Stripe secret key: server-only Stripe API credential.
- Stripe webhook secret: server-only signature verification secret.
- Public Stripe publishable key: browser-safe key only if the chosen checkout flow needs it.

`.env.example` contains local-only development examples and blank future-secret placeholders. Real values belong in ignored local environment files or hosted secret stores.

Production must provide strong, independent `AUTH_SECRET` and `RATE_LIMIT_SECRET` values. Rotating `AUTH_SECRET` invalidates existing sessions. Provision administrative accounts through a controlled one-off environment or local direct database connection, never through a public route.

Start the local database with `docker compose up -d db`, then run generation, migration, status, seed, and smoke scripts from `package.json`. Production migrations must be reviewed and applied as an explicit deployment step; destructive resets are not part of the deployment workflow. Hosted QA should eventually verify payments, webhooks, order state, inventory behavior, responsive layout, and accessibility.
