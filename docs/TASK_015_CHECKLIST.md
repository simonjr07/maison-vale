# TASK-015 deployment and hosted QA checklist

This checklist prepares Maison Vale for a portfolio sandbox deployment. It does not authorize live commerce. Keep Stripe in test mode and capture evidence without exposing credentials, full customer data, provider identifiers, or internal diagnostic text.

Current status: repository preparation is in progress. The owner reports that all five migrations were applied successfully to the intended Neon database. The guarded public catalogue bootstrap has not been executed. No hosted URL, production administrator, Stripe Dashboard destination, hosted payment, browser QA, log review, backup restore, or final screenshot has been verified. Complete account-owned steps in the relevant dashboard; never paste credentials into chat.

## Before deployment

- [x] Review the TASK-014 security audit and carry every remaining blocker into hosted QA.
- [ ] Confirm the intended Vercel project, Neon project and branch, canonical HTTPS hostname, owners, and rollback contact.
- [ ] Protect the deployment branch and require the CI workflow to pass.
- [ ] Run `npm ci`, Prisma generation and validation, lint, typecheck, unit tests, every PostgreSQL integration suite, production build, both dependency audits, and `git diff --check` from the release revision.
- [ ] Review all migrations. Use `prisma migrate deploy`; never use reset, development migration generation, or seed against production.
- [x] Confirm no real secret, `.env` file, customer export, or production credential is tracked; the live-key test sentinel is intentional.

## Neon PostgreSQL

- [ ] Confirm the saved runtime URL uses Neon's `-pooler` hostname and retains provider-supplied TLS parameters. Do not append port 6543 or `pgbouncer=true`.
- [ ] Set Vercel `DATABASE_URL` to that pooled URL as a Secret.
- [ ] Keep the distinct, unpooled `DIRECT_URL` in the controlled migration environment only; do not expose it to the Vercel web runtime.
- [ ] Use the narrowest practical role grants; reserve schema-changing privileges for controlled migrations when separate roles are available.
- [ ] Require TLS in both URLs with an approved `sslmode` and confirm certificate behavior for the selected mode.
- [ ] Run the guarded migration status command, obtain explicit approval, apply the five reviewed migrations once with the guarded deploy command, then verify status again. Do not run the development seed.
- [ ] Before catalogue bootstrap, reconfirm the pooled and direct URLs target the intended Neon branch/database, verify all five migrations, and record a usable restore point or recovery procedure.
- [ ] With separate approval, run the documented `--public-catalogue-only` command from a controlled Windows CMD shell. Confirm it reports at most 4 categories, 8 products, 20 variants, and 24 images created; investigate any conflict rather than bypassing it.
- [ ] Rerun the guarded mode only if verification requires it; it must report zero creations. Remove `ALLOW_REMOTE_SEED` and close the controlled shell immediately afterward.
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
- [ ] Confirm Node.js 22, the Next.js preset, `npm install`, `npm run build`, and framework-managed output are selected. Do not add migrations or seeds to the build command.

## One-off operations

- [ ] Provision the initial administrator from a controlled job or direct environment. Temporarily set `ALLOW_PRODUCTION_ADMIN_PROVISIONING=true`, run the command once, then remove the gate and credentials.
- [ ] Verify ADMIN login and STAFF read-only behavior. Confirm inactive accounts lose access after the database recheck.
- [ ] Schedule `npm run rate-limits:cleanup -- --apply` in an authorized environment. Run the dry mode first and monitor failures.
- [ ] Keep sandbox reconciliation disabled. If a test event was genuinely missed, use the documented diagnostic first and enable reconciliation only for that controlled operation.
- [ ] Never place the public catalogue bootstrap in a Vercel build, application startup, CI pipeline, or recurring job. Never substitute ordinary `npm run db:seed`.

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

## External actions needed to continue

- [x] The owner created the Neon project and securely saved pooled and direct connection strings.
- [ ] The owner selects the Vercel project and confirms the Neon branch, region, canonical hostname, owners, and rollback contact.
- [ ] The owner configures sensitive values directly in the provider dashboards without sharing them in chat.
- [ ] The owner confirms that the reviewed remote migrations may be applied.
- [ ] The owner separately authorizes the guarded public-catalogue-only bootstrap after confirming target identity and recovery readiness.
- [ ] After the HTTPS deployment exists, the owner creates the Stripe sandbox webhook destination and configures its unique signing secret in Vercel.
- [ ] The owner supplies only the public deployment URL for automated read-only QA; no credentials are needed for that check.
