# Security boundaries

Stripe webhook signatures are verified from the untouched raw body before event data is used. Prices, shipping, tax, order snapshots, payment expectations, and inventory remain server-authoritative.

Secrets belong in environment configuration and must never reach browser bundles, source control, logs, or error responses. Logs should omit payment credentials and unnecessary personal data. Same-origin and CSRF considerations must be reviewed for state-changing browser requests. Database constraints and transactions must preserve integrity, including non-negative inventory and idempotent payment events.

These are preliminary controls, not a compliance or penetration-testing claim.

The initial migration enforces non-negative inventory and monetary values, positive quantities/refunds, and consistent order arithmetic. These checks are a final database boundary, not a replacement for request validation or transactional application logic. The generated client is excluded from source control, and the runtime client is marked server-only to prevent accidental client-component imports.

## Inventory integrity

TASK-005 keeps stock authoritative at `ProductVariant`. Inventory commands are server-only and validated at runtime; individual adjustment quantities and explicit stock levels are capped at 100,000 units. Purchase-style decrements use an atomic conditional update, so concurrent callers cannot both consume the same final unit. PostgreSQL retains the non-negative stock check as a final boundary.

Every successful mutation writes a non-zero `InventoryMovement` in the same transaction. Failed mutations roll back without an audit row. Movement references must be supplied as a complete type/id pair, and existing history prevents variant deletion. Public availability remains advisory. Product-detail DTOs disclose an exact count only for the intentionally bounded low-stock range of one through ten; larger quantities are represented only as `In stock`, and raw stock fields are never serialized.

Administrative catalogue pages require an active authenticated user. Reads are available to ADMIN and STAFF; all product, variant, category, image, archive, and inventory mutations call the ADMIN role guard inside the Server Action. UI visibility is not treated as authorization. Zod schemas bound text, identifiers, prices, stock, slugs, and booleans. Image values come from a fixed local allow-list, so the feature does not introduce uploads, remote fetches, or stored arbitrary URLs.

The photography manifest contains only public asset paths, descriptive alternative text, product slugs, colours, and presentation roles. It contains no stock authority, admin-only inventory fields, customer data, credentials, or remote-fetch capability. Variant imagery is presentational: cart and checkout still resolve the selected variant against current server-side catalogue and inventory state.

Administrative stock setting uses the existing inventory service and includes the quantity observed by the form. A stale write fails before changing stock or creating a movement. Products and variants are archived instead of deleted, and a category with visible products cannot be deactivated. Catalogue actions return safe operational messages and do not expose database diagnostics or secrets.

## Guest cart boundary

Guest cart storage is untrusted browser input. The persisted value contains only a schema version, variant UUIDs, and quantities—never money, product authority, personal data, or secrets. Malformed JSON, unsupported versions, invalid quantities, duplicate overflow, and excessive carts recover to a safe empty state.

The cart resolver repeats server-side validation and discards unknown fields. PostgreSQL supplies current visibility, variant activity, stock constraints, prices, names, and images. All monetary calculations use integer cents. Cart resolution never mutates stock, writes inventory movements, or creates orders, payments, or customer records.

## Guest checkout boundary

Checkout treats contact, address, cart, and all extra client fields as hostile input. Zod validates and normalizes bounded guest fields, while the server independently re-resolves PostgreSQL visibility, availability, quantities, and prices. Shipping, tax, and total amounts are calculated only from current server data; client-supplied commerce values are ignored.

Checkout previews are stateless. Payment initiation persists email and address only as an order snapshot, uses byte-bounded bodies and an exact canonical Origin check, and never logs the request. The existing database limiter is reused with checkout-specific HMAC namespaces for both email/source pairs and a broader source-only ceiling; raw email and source values are not stored. Attempt tokens are also stored only as HMAC digests.

Stripe secret and webhook keys remain server-only. The adapter accepts only `sk_test_` keys, rejects live-mode sessions and events, and does not need the publishable key for hosted Checkout. Metadata contains only internal order linkage. Raw webhook bodies, secrets, card data, full addresses, provider event identifiers, and order references are never logged. Routine webhook logs retain only the event type and allow-listed outcome category. The success route reads database state and clears the browser cart only after verified PAID/PROCESSING state.

## Guest order lookup

Order references are identifiers, not credentials. Public details require both the normalized reference and exact normalized checkout email. HMAC comparisons reduce value-dependent comparison behavior, and missing orders use the same proof path and generic response as incorrect email. Source and proof-pair limits use the existing PostgreSQL fixed-window table with HMAC-only keys; raw email, reference, and source values are not retained in rate-limit records.

Successful verification issues a signed 15-minute HttpOnly, SameSite session cookie scoped to `/orders` and one internal order id. The details route queries by that scope and constant-time compares the route reference before mapping an explicit public DTO. Email, full address, SKU, database ids, Stripe ids, issue messages, and status-event notes are excluded. Street address is omitted, recipient and postal code are masked, and pages are marked noindex.

Email plus order reference is lightweight guest verification. Anyone with access to both values can view the limited order summary. Maison Vale does not yet have email delivery infrastructure, so one-time email links or codes are deferred as the preferred stronger ownership check. The lookup route requires the canonical Origin; this is defense in depth and does not replace the proof. Trusted production proxies must overwrite client-address headers used by rate limiting.

## Administrative authentication

TASK-003 implements Auth.js credentials authentication with eight-hour encrypted JWT sessions. Only user id and role are added to the session. Passwords are hashed with bcrypt using 12 rounds; inputs are normalized and validated with Zod; inactive users and invalid credentials receive the same public response. A dummy bcrypt comparison reduces account-existence timing differences.

Every protected page resolves the session and rechecks id, role, and active state from PostgreSQL. ADMIN-only and explicitly shared ADMIN/STAFF access use reusable server-side role helpers. There is no registration route.

Administrative order pages are request-time, noindex views behind the same active-user database recheck. ADMIN and STAFF can read fulfillment information, including contact and full shipping address, because both roles are trusted operational users. Customer-email search is submitted through an authenticated same-origin Server Action instead of a query string, preventing PII from entering URLs, redirects, or metadata. Public order DTO masking and scoped guest authorization remain unchanged.

Every fulfillment action independently requires ADMIN, validates an explicit transition allow-list, and conditionally updates the expected current state. A current `PAID` payment and null payment issue are part of the transactional predicate. Duplicate and concurrent submissions cannot create duplicate events. Status notes are internal and may contain the acting administrator email; public order mapping continues to omit notes. No action accepts or returns Stripe identifiers, raw provider failures, webhook data, secrets, or payment controls.

## Administrative analytics

Analytics inherits the protected request-time admin layout, active-user database recheck, ADMIN/STAFF read policy, and noindex metadata. The period input is allow-listed before database access. The analytics service is read-only and selects no customer email, recipient, address, provider id, webhook id, internal issue text, or status-event note.

Payment records—not redirects or browser state—supply gross sales. The query includes only USD `PAID`, `PARTIALLY_REFUNDED`, and `REFUNDED` records with a persisted provider-observed amount; refund totals come from persisted `Refund` rows. Stripe webhook events are excluded from all financial joins, preventing redelivery ledger rows from multiplying revenue. Current inventory is displayed separately from period financials and cannot authorize checkout or reserve stock.

Login attempts use a 15-minute fixed window with five attempts per normalized email/source pair and a broader 25-attempt source ceiling. Payment-session creation similarly combines a five-attempt pair limit with a 20-attempt source ceiling. Stored bucket keys are domain-separated HMAC-SHA256 digests using `RATE_LIMIT_SECRET`; raw identifiers are not stored. Missing secrets and database failures deny protected operations. Auth logs omit credentials and expected invalid-credential details.

Auth.js trusts the host supplied by the deployment platform. On Vercel, rate limiting uses only `x-vercel-forwarded-for`, which the platform overwrites. Other production deployments ignore forwarding headers unless `TRUST_PROXY_HEADERS=true` is deliberately enabled behind a trusted proxy that overwrites them. Forwarded values are parsed as IP addresses; malformed input receives the shared anonymous bucket.

## Web and deployment hardening

Global response headers deny framing, object embedding, MIME sniffing, cross-domain policy files, unnecessary browser capabilities, and unsafe referrer detail. Production enables HSTS. Administrative, checkout, order, and API responses are private and non-cacheable, and sensitive surfaces opt out of indexing. Framework disclosure and production browser source maps are disabled.

The CSP restricts base URLs, form submissions, object sources, and framing without broadening script execution. A strict nonce-based `script-src` is intentionally deferred until hosted Next.js rendering, third-party redirects, and error pages can be tested together; adding a guessed policy could make the application unavailable without materially validating it.

Non-local production PostgreSQL connections must explicitly request TLS. Production secrets must be long, independent, server-only values. The deployment checker validates shape and separation without printing values, rejects live Stripe credentials because the application remains sandbox-only, and flags temporary operator credentials or gates left enabled.

Seed, sandbox reconciliation, and production administrator provisioning are operator commands, not application endpoints. Ordinary remote seeding and production reconciliation remain prohibited. The sole hosted seed exception is the explicit `--public-catalogue-only` bootstrap: it requires `ALLOW_REMOTE_SEED=true`, the private `.env.neon.local` path, matching TLS-protected Neon pooled/direct targets, and a non-Vercel operator shell. It takes a transaction-scoped advisory lock, performs collision checks before catalogue writes, creates only missing public definitions in one transaction, and never updates or deletes existing rows. StoreSettings and hidden development fixtures are excluded. The gate must remain unset in normal runtime. Expired rate-limit cleanup is dry-run first. See [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) for findings and residual risk.

The Vercel web runtime receives only the pooled, least-privilege `DATABASE_URL`; the direct migration credential is kept in a separate controlled environment. Clean client generation uses an unreachable placeholder and cannot mutate a database. Production functions use a one-connection application pool behind the provider pooler. Public robots and sitemap routes exclude administrative, API, cart, checkout, and order surfaces, while response headers and page metadata provide an additional noindex boundary.

The hosted smoke command is read-only. Its only POST requests deliberately omit the Origin header and must be rejected before parsing, rate limiting, or business logic. It never signs in, looks up an order, starts Checkout, calls Stripe, mutates inventory, runs migrations, seeds data, or invokes reconciliation.
