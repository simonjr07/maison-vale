# TASK-015 deployment and hosted QA checklist

This checklist prepares Maison Vale for a portfolio sandbox deployment. It does not authorize live commerce. Keep Stripe in test mode and capture evidence without exposing credentials, full customer data, provider identifiers, or internal diagnostic text.

## Before deployment

- [ ] Review the TASK-014 security audit and resolve or explicitly accept every remaining blocker.
- [ ] Confirm the intended Vercel project, Supabase project, canonical HTTPS hostname, owners, and rollback contact.
- [ ] Protect the deployment branch and require the CI workflow to pass.
- [ ] Run `npm ci`, Prisma generation and validation, lint, typecheck, unit tests, every PostgreSQL integration suite, production build, both dependency audits, and `git diff --check` from the release revision.
- [ ] Review all migrations. Use `prisma migrate deploy`; never use reset, development migration generation, or seed against production.
- [ ] Confirm no real secret, `.env` file, customer export, or production credential is tracked.

## Supabase

- [ ] Create separate runtime and migration roles when supported. Grant the runtime role only required table and sequence access; reserve DDL for the migration role.
- [ ] Set `DATABASE_URL` to the supported pooled runtime endpoint and `DIRECT_URL` to the direct migration endpoint.
- [ ] Require TLS in both URLs with an approved `sslmode` and confirm certificate behavior for the selected mode.
- [ ] Apply reviewed migrations once, then verify migration status. Do not run the development seed.
- [ ] Configure backups and perform a documented restore drill before claiming production readiness.
- [ ] Confirm connection and pool limits against Vercel concurrency; record the chosen limits.

## Vercel environment

- [ ] Set canonical HTTPS `APP_URL` without a path, query, fragment, or embedded credentials.
- [ ] Generate independent values of at least 32 characters for `AUTH_SECRET`, `RATE_LIMIT_SECRET`, and `ORDER_LOOKUP_SECRET` in the hosted secret store.
- [ ] Keep `TRUST_PROXY_HEADERS=false`; Vercel's overwritten forwarded-address header is used automatically.
- [ ] Keep all operator gates false or unset during runtime.
- [ ] Do not leave `ADMIN_EMAIL` or `ADMIN_PASSWORD` in the runtime environment.
- [ ] Configure only `sk_test_`, `whsec_`, and, if needed, `pk_test_` Stripe credentials. Never add live keys.
- [ ] Run `npm run deployment:check` in the target environment and retain redacted pass/fail evidence.

## One-off operations

- [ ] Provision the initial administrator from a controlled job or direct environment. Temporarily set `ALLOW_PRODUCTION_ADMIN_PROVISIONING=true`, run the command once, then remove the gate and credentials.
- [ ] Verify ADMIN login and STAFF read-only behavior. Confirm inactive accounts lose access after the database recheck.
- [ ] Schedule `npm run rate-limits:cleanup -- --apply` in an authorized environment. Run the dry mode first and monitor failures.
- [ ] Keep sandbox reconciliation disabled. If a test event was genuinely missed, use the documented diagnostic first and enable reconciliation only for that controlled operation.

## Stripe sandbox

- [ ] Create the hosted webhook endpoint for `/api/stripe/webhook` and store its Dashboard endpoint secret. Do not reuse a Stripe CLI listener secret.
- [ ] Subscribe only to the required event type and confirm valid delivery, signature rejection, duplicate delivery, and delayed different-event idempotency.
- [ ] Complete one real test Checkout and verify the database, success page, public lookup, admin order page, analytics, inventory movement, and webhook outcome agree.
- [ ] Verify a redirect without a processed webhook remains pending and is never displayed as paid.
- [ ] Verify a paid stock-conflict fixture preserves PAID payment truth, leaves fulfillment pending, creates no partial inventory movement, and presents the internal review state only to authorized staff.
- [ ] Confirm live-mode events and live keys are rejected.

## Browser and platform QA

- [ ] Inspect deployed security headers, HSTS, private/no-store behavior, and noindex policy on admin, checkout, orders, and API surfaces.
- [ ] Verify administrative and order-lookup cookies are Secure, HttpOnly where applicable, correctly scoped, and absent from URLs or client-visible payloads.
- [ ] Test rejected missing and cross-origin requests for order lookup and Checkout Session creation.
- [ ] Verify spoofed generic forwarding headers do not change the Vercel rate-limit source.
- [ ] Exercise generic auth and lookup errors, source-wide rate limits, session expiry, direct refreshes, and cross-order isolation without recording PII in screenshots.
- [ ] Complete the TASK-013 keyboard, screen-reader, reduced-motion, zoom, responsive, and optimized-image checks on the hosted origin.
- [ ] Verify no source maps, framework disclosure header, raw provider id, secret, full address, email search term, or diagnostic note appears publicly.

## Observability and response

- [ ] Configure alerts for elevated 5xx responses, webhook failures/retries, database exhaustion, rate-limit cleanup failure, authentication abuse, and paid inventory-review exceptions.
- [ ] Define owners and response times for paid inventory exceptions, refund decisions, database incidents, suspected credential compromise, and failed deploys.
- [ ] Confirm logs omit secrets, raw request bodies, passwords, card data, full addresses, and unnecessary email values. Set and document retention.
- [ ] Record secret rotation procedures. Remember that rotating `AUTH_SECRET` signs administrators out and rotating `ORDER_LOOKUP_SECRET` expires guest lookup sessions.

## Rollback

- [ ] Retain the previous known-good deployment and identify the exact revision before release.
- [ ] Prefer application rollback when migrations are backward-compatible. Do not reverse or delete payment, webhook, order, status, refund, or inventory records to make a rollback appear clean.
- [ ] For a database migration problem, stop writes if necessary, preserve evidence, use the reviewed forward-fix or tested restore procedure, and reconcile external Stripe truth before reopening checkout.
- [ ] Disable the payment initiation surface if webhook or database integrity is uncertain. A browser redirect must never be used to reconstruct payment state.
- [ ] After rollback, repeat payment, order, inventory, auth, cache-header, and privacy smoke checks and document the incident.

## Portfolio evidence

- [ ] Capture desktop and mobile storefront, cart, checkout, guest lookup, admin catalogue, order operations, and analytics views with synthetic data only.
- [ ] Record CI, deployment-check, migration, header, accessibility, and sandbox payment evidence with all credentials and provider ids redacted.
- [ ] State limitations plainly: test payments only, lightweight guest verification, manual fulfillment, no carrier tracking, no automated tax/refunds, and no claim of penetration testing or compliance certification.
