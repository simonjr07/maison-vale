# Deployment

## Intended topology

Local development uses Next.js with the PostgreSQL 17 service in `compose.yaml`, exposed on host port 5435. The hosted target is Vercel, the existing Neon PostgreSQL project, and Stripe sandbox. The owner reports that all five reviewed migrations have been applied to Neon. The hosted catalogue bootstrap, deployment URL, and webhook delivery have not been executed or verified from this repository.

Likely configuration responsibilities:

- `DATABASE_URL`: runtime application connection used by the PostgreSQL driver adapter.
- `DIRECT_URL`: direct Prisma CLI and migration connection used only in a controlled migration environment, not the Vercel web runtime.
- `AUTH_SECRET`: server-only session/authentication secret.
- `RATE_LIMIT_SECRET`: server-only HMAC key for login rate-limit identities.
- `ORDER_LOOKUP_SECRET`: recommended independent server-only key for guest lookup sessions and proof comparison. When omitted, the application uses domain-separated `AUTH_SECRET` as a compatibility fallback.
- `APP_URL`: trusted application origin used for Stripe return URLs.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: local-only inputs for the explicit provisioning command; they should not remain set in hosted runtime environments.
- `STRIPE_SECRET_KEY`: server-only Stripe test API credential; TASK-008 rejects live keys.
- `STRIPE_WEBHOOK_SECRET`: server-only endpoint secret from Stripe CLI or Dashboard.
- Public Stripe publishable key: browser-safe key only if the chosen checkout flow needs it.
- `TRUST_PROXY_HEADERS`: leave `false` on Vercel; enable only behind a controlled proxy that overwrites forwarding headers.
- `ALLOW_REMOTE_SEED`, `ALLOW_SANDBOX_RECONCILIATION`, and `ALLOW_PRODUCTION_ADMIN_PROVISIONING`: temporary operator gates; leave `false` during normal runtime.

`.env.example` contains local-only development examples and blank future-secret placeholders. Real values belong in ignored local environment files or hosted secret stores.

Production must provide strong, independent `AUTH_SECRET`, `RATE_LIMIT_SECRET`, and `ORDER_LOOKUP_SECRET` values. Rotating `AUTH_SECRET` invalidates administrative sessions; rotating the order lookup secret invalidates short-lived guest lookup sessions. Provision administrative accounts through a controlled one-off environment or local direct database connection, never through a public route. The production application remains Stripe test-mode only; live Stripe keys or live events are rejected.

Run `npm run deployment:check` in the Vercel runtime environment before a release. It validates the canonical HTTPS origin, runtime PostgreSQL TLS, secret length and separation, test-only Stripe configuration, and disabled operator gates without printing values. Run `npm run deployment:check:migrations` separately wherever migrations are applied; that check also requires a distinct `DIRECT_URL`.

`DATABASE_URL` uses the pooled URL copied from Neon's Connection Details panel. Its hostname has the form `ep-<endpoint>-pooler.<region>.<provider>.neon.tech`, normally on port 5432, and must retain `sslmode=require` or a stronger supported mode. Preserve provider-supplied parameters such as `channel_binding=require`. Do not append Supabase-specific port 6543 or `pgbouncer=true` settings.

`DIRECT_URL` uses the matching unpooled Neon URL for reviewed Prisma CLI operations. Its hostname has the same endpoint identity without the `-pooler` suffix and must retain its TLS parameters. Prisma 7 reads this value through `datasource.url` in `prisma.config.ts`. The Vercel build does not need `DIRECT_URL`: client generation uses a deliberately unreachable fallback, while any database-accessing Prisma command fails closed unless the operator supplies `DIRECT_URL`.

Use the narrowest practical Neon role grants. The runtime role needs only the table and sequence access required by normal application reads and writes; a migration role may hold schema-changing privileges when separate credentials are available. Regardless of whether Neon issued the same role in both saved URLs, the unpooled migration credential must not be exposed to the Vercel web runtime. Each production function limits its application-side `pg` pool to one connection, while Neon's pooled endpoint handles server-side transaction pooling. Never run the ordinary development seed against a remote database; it is now local-only even when `ALLOW_REMOTE_SEED=true` is present.

Catalogue management requires no new environment values or storage service. Product images are selected from reviewed, optimized files deployed under `public/catalogue/photography`; adding or replacing an asset requires code review, an update to the asset manifest and admin allow-list, and an idempotent seed run. Confirm ADMIN and STAFF role assignments before hosted QA because STAFF access is intentionally read-only. Production should set `APP_URL` to the canonical HTTPS origin so absolute social metadata resolves correctly.

Order administration requires no new environment values or schema migration. Hosted QA must verify that STAFF can read but cannot submit fulfillment changes, ADMIN transitions require verified paid orders, customer-email searches do not appear in URLs, and admin pages carry noindex behavior. Operational teams must understand that `SHIPPED` and `DELIVERED` are manual confirmations only; do not use this workflow as evidence of carrier acceptance or delivery. Production carrier/tracking and refund procedures remain unresolved launch requirements.

Analytics requires no new environment value or migration. Hosted QA should compare one known paid test order and one persisted test refund against the 7-day and all-time views, confirm pending and failed payments remain excluded, confirm STAFF can read the dashboard, and verify that inventory alerts link to the matching administrative inventory record. The sandbox notice must remain visible while the Stripe adapter is test-mode only. Financial periods use UTC, so QA near a local-day boundary should compare against UTC dates.

TASK-013 hosted QA should verify every seeded colour selection changes to the matching gallery, every image returns successfully through the production image optimizer, checkout and order pages remain noindex, and the storefront remains usable at 320 px and 200% zoom. Run a keyboard and screen-reader smoke test and confirm reduced-motion preferences suppress decorative transitions before capturing portfolio evidence.

Start the local database with `docker compose up -d db`, then run generation, migration, status, seed, and smoke scripts from `package.json`. Production migrations must be reviewed and applied with `prisma migrate deploy` as an explicit deployment step; destructive resets and seed runs are not part of production deployment. CI repeats migration, unit, integration, static, and build verification against an isolated PostgreSQL service. Hosted QA must still verify security headers, cookies, proxy-derived rate limits, payments, webhooks, order state, inventory behavior, responsive layout, and accessibility.

For local webhook QA, run the application and use Stripe CLI forwarding to `http://localhost:3000/api/stripe/webhook`, then set the listener's `whsec_` value in the ignored `.env`. Missing payment configuration fails only payment routes; unrelated storefront pages continue to run. Pending orders abandoned before payment are retained for audit and require a future expiry or cleanup job. Production activation is explicitly outside TASK-008.

Stripe CLI forwarding is not retroactive: start the listener before opening Checkout. A later `stripe trigger checkout.session.completed` creates a different synthetic Session and may correctly produce `UNKNOWN_SESSION`. Use the redacted payment diagnostic to distinguish that outcome. The explicit sandbox reconciliation command can recover a missed real test event only after authenticated Stripe API checks pass; it requires `ALLOW_SANDBOX_RECONCILIATION=true`, is disabled in production, and cannot create a payment or infer payment from the browser redirect.

Production order lookup depends on HTTPS for Secure cookies and on a trusted proxy that supplies normalized client-address headers. On Vercel the application uses the platform-owned forwarded header and ignores caller-controlled generic forwarding headers. Schedule `npm run rate-limits:cleanup -- --apply` from an authorized maintenance environment; run it without `--apply` first to inspect the expired-row count. Stronger email ownership verification requires a future transactional email provider; no email code or magic link is implied by the current guest flow.

Provisioning against a production database requires the explicit temporary `ALLOW_PRODUCTION_ADMIN_PROVISIONING=true` gate plus `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Remove all three values immediately after the one-off command, rotate the credential through an approved process when needed, and verify the account through the protected login flow. The script never prints the password.

The complete release sequence, smoke checks, evidence requirements, and rollback guidance are in [`TASK_015_CHECKLIST.md`](./TASK_015_CHECKLIST.md). A successful local build is not evidence that Vercel, Neon, DNS, cookies, or Stripe webhook delivery are configured correctly.

## Vercel project settings

Use the Git repository root, the detected Next.js framework preset, Node.js 22, `npm install`, `npm run build`, and the framework-managed output directory. Do not run migrations or seeds in the Vercel build command. The build script regenerates the ignored Prisma client before compiling.

Configure these values in the Vercel dashboard without copying their values into documentation or chat:

| Variable | Scope | Notes |
|---|---|---|
| `APP_URL` | Production | Canonical HTTPS origin only. Update after the production domain is known, then redeploy. |
| `DATABASE_URL` | Production | Neon pooled URL with a `-pooler` hostname and provider-supplied TLS parameters. Store as a Vercel Secret. |
| `AUTH_SECRET` | Production, sensitive | Independent random value of at least 32 characters. |
| `RATE_LIMIT_SECRET` | Production, sensitive | Independent random value of at least 32 characters. |
| `ORDER_LOOKUP_SECRET` | Production, sensitive | Independent random value of at least 32 characters. |
| `STRIPE_SECRET_KEY` | Production, sensitive | Stripe sandbox `sk_test_` key only. |
| `STRIPE_WEBHOOK_SECRET` | Production, sensitive | Unique `whsec_` from the hosted Dashboard endpoint, added after that endpoint exists. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Production | Optional `pk_test_` key; current hosted Checkout flow does not require it. |
| `TRUST_PROXY_HEADERS` | Production | `false` on Vercel. |
| Operator gates | Production | Leave unset or `false`. |

Do not configure `DIRECT_URL`, `ADMIN_EMAIL`, or `ADMIN_PASSWORD` in the Vercel web runtime. Vercel applies environment changes only to new deployments, so redeploy after changing configuration. Mark server secrets as sensitive where the account plan and environment support it.

## Neon database sequence

These steps require the database owner and explicit approval before any remote write:

1. In the existing Neon project, confirm the intended branch, database, region, compute, pooled connection, direct connection, role grants, TLS parameters, and backup/restore options. Do not expose either saved URL.
2. In a controlled operator shell, set the saved pooled URL as `DATABASE_URL` and the saved unpooled URL as `DIRECT_URL`. Do not store either value in a tracked file, command argument, report, or chat.
3. Confirm `DATABASE_URL` contains the Neon `-pooler` hostname and `DIRECT_URL` does not. Both must identify the intended hosted database, request TLS, and differ from the local Docker URLs.
4. Run `npm run deployment:check:migrations`. This validates URL shape and TLS without printing either value and rejects localhost, identical URLs, a non-pooled Neon runtime URL, or a pooled Neon migration URL.
5. Run `npm run deployment:migrations:status` and review its redacted output. The wrapper repeats the fail-closed checks before invoking Prisma. Prisma 7 obtains the migration target from `DIRECT_URL` through `prisma.config.ts`; stop if the database identity or status is unexpected.
6. After explicit approval for the five reviewed migrations, run `npm run deployment:migrations:deploy`. Do not use `migrate dev`, `db push`, reset, or seed. The guarded command applies tracked migrations without resetting data.
7. Run `npm run deployment:migrations:status` again and verify that all five migrations are applied. Inspect only the expected schema and empty-table state; do not fabricate orders, payments, refunds, webhook rows, inventory movements, or analytics.
8. If the fictional catalogue is required, follow the guarded public catalogue bootstrap procedure below. Never use ordinary `npm run db:seed` against Neon.
9. Provision one administrator through the controlled command only after migrations. Remove provisioning variables and the temporary gate immediately afterward.

Neon identifies pooled connections with `-pooler` in the hostname and supports prepared statements through its current PgBouncer configuration; Prisma does not require `pgbouncer=true` for this endpoint. Maison Vale still uses the separate direct URL for controlled migrations to keep runtime and schema-change credentials operationally separate. Backup availability, restore windows, scale-to-zero behavior, and point-in-time recovery depend on the selected Neon plan and settings; record the actual configuration and do not claim a restore test until one succeeds.

### Guarded public catalogue bootstrap

The one-off `--public-catalogue-only` mode is the only seed path permitted for Neon. Before creating a Prisma client, it requires `ALLOW_REMOTE_SEED=true`, rejects Vercel runtime execution, requires the private repository-root `.env.neon.local` file, and validates both connection strings. `DATABASE_URL` must be the TLS-protected Neon pooled endpoint, while `DIRECT_URL` must be the matching TLS-protected direct endpoint for the same endpoint identity and database. Neither value is printed. The bootstrap writes through `DATABASE_URL`; `DIRECT_URL` is required only as an independent target-identity check.

The private `.env.neon.local` file must contain only the saved `DATABASE_URL` and `DIRECT_URL` values needed for this operation and must remain ignored. From Windows CMD at the repository root, use this exact command only after explicit approval:

```cmd
set "DATABASE_URL=" && set "DIRECT_URL=" && set "DOTENV_CONFIG_PATH=.env.neon.local" && set "ALLOW_REMOTE_SEED=true" && node --env-file=.env.neon.local --experimental-strip-types prisma\seed.mjs --public-catalogue-only
```

Clearing inherited URL variables prevents Node's environment-file precedence from silently selecting another database. `--env-file` fails if the private file is missing, and `DOTENV_CONFIG_PATH` prevents `dotenv/config` from loading the ordinary `.env`. The application guard then rejects local Docker, non-Neon, non-TLS, pooled/direct role reversal, and mismatched endpoint or database targets before opening a connection.

The bootstrap validates the fixed definitions, acquires a transaction-scoped PostgreSQL advisory lock, completes a read-only collision preflight, and creates only missing rows in one transaction. Its complete target is 4 categories, 8 public products, 20 variants, and 24 image references. It never creates StoreSettings, Archive Sample Shirt, Retired Sample Object, or other development fixtures. Existing matching rows are not updated, including edited names, descriptions, status, prices, inventory, and image metadata. Product/category ownership, SKU ownership, image URL ownership, and image positions must match; otherwise the transaction stops with a redacted conflict message. A completed rerun creates zero rows.

On failure, retain the single redacted diagnostic line. It identifies only the transaction stage, failure category, and available Prisma, PostgreSQL, or transport code; it never prints the provider message, connection string, credentials, row data, or query parameters. `P2028` indicates transaction acquisition or expiry, `P2039` is an adapter-level database failure, SQLSTATE class `23` is a constraint failure, and transport codes such as `ETIMEDOUT` indicate connectivity. Do not bypass the guard or retry repeatedly without interpreting that line. The one-off client uses one connection, a 30-second connection/acquisition budget, and a 120-second transaction budget to accommodate a resumed hosted compute while keeping the operation bounded.

Before approval, confirm the five migrations, intended branch/database, role grants, and a usable Neon restore point or recovery procedure. A failed transaction rolls itself back. A successful additive bootstrap has no automated application-level undo; do not delete catalogue or commerce rows to simulate rollback. If the wrong valid target was selected, stop application writes, preserve evidence, and use the reviewed Neon restore or forward-fix procedure. Unset `ALLOW_REMOTE_SEED` and close the controlled shell immediately after the operation. Do not place this command in Vercel builds, CI, startup hooks, or recurring jobs.

## Stripe hosted webhook

After the verified production HTTPS URL exists:

1. Open Stripe Workbench in a sandbox and create an event destination for the account.
2. Select the snapshot event `checkout.session.completed` only.
3. Set the endpoint to `https://HOST/api/stripe/webhook` without a redirect.
4. Reveal the destination's unique `whsec_` once and enter it directly into the Vercel sensitive environment setting. Do not reuse the Stripe CLI listener secret.
5. Redeploy, complete one real sandbox Checkout, and confirm Stripe records a successful HTTP delivery.
6. Compare the redacted application diagnostic, database state, customer confirmation, inventory movement, status history, and admin analytics. Redeliver the same event and confirm no second decrement or transition occurs.

Stripe requires a publicly accessible HTTPS endpoint and raw-body signature verification. A synthetic event creates its own Checkout Session and cannot prove that an earlier customer Session was finalized.

## Read-only hosted smoke check

After deployment, run:

```bash
npm run qa:hosted -- --url=https://HOST
```

The command verifies public routes, robots and sitemap boundaries, production headers, unauthenticated admin redirection, all 25 optimized image assets, and rejection of missing-Origin requests. It performs no login, checkout, payment, order lookup, mutation, migration, seed, or reconciliation. Complete the remaining manual checks in the TASK-015 checklist.

## Primary platform references

- [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Neon and Prisma](https://neon.com/docs/guides/prisma)
- [Prisma 7 PostgreSQL configuration](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql)
- [Prisma 7 configuration reference](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)
- [Prisma production migrations](https://docs.prisma.io/docs/cli/migrate/deploy)
- [Stripe webhook endpoints](https://docs.stripe.com/webhooks)
- [Stripe sandbox testing](https://docs.stripe.com/testing)
