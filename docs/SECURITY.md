# Security boundaries

Stripe webhook signatures are verified from the untouched raw body before event data is used. Prices, shipping, tax, order snapshots, payment expectations, and inventory remain server-authoritative.

Secrets belong in environment configuration and must never reach browser bundles, source control, logs, or error responses. Logs should omit payment credentials and unnecessary personal data. Same-origin and CSRF considerations must be reviewed for state-changing browser requests. Database constraints and transactions must preserve integrity, including non-negative inventory and idempotent payment events.

These are preliminary controls, not a compliance or penetration-testing claim.

The initial migration enforces non-negative inventory and monetary values, positive quantities/refunds, and consistent order arithmetic. These checks are a final database boundary, not a replacement for request validation or transactional application logic. The generated client is excluded from source control, and the runtime client is marked server-only to prevent accidental client-component imports.

## Inventory integrity

TASK-005 keeps stock authoritative at `ProductVariant`. Inventory commands are server-only and validated at runtime; individual adjustment quantities and explicit stock levels are capped at 100,000 units. Purchase-style decrements use an atomic conditional update, so concurrent callers cannot both consume the same final unit. PostgreSQL retains the non-negative stock check as a final boundary.

Every successful mutation writes a non-zero `InventoryMovement` in the same transaction. Failed mutations roll back without an audit row. Movement references must be supplied as a complete type/id pair, and existing history prevents variant deletion. Public availability remains advisory. Product-detail DTOs disclose an exact count only for the intentionally bounded low-stock range of one through ten; larger quantities are represented only as `In stock`, and raw stock fields are never serialized.

Administrative catalogue pages require an active authenticated user. Reads are available to ADMIN and STAFF; all product, variant, category, image, archive, and inventory mutations call the ADMIN role guard inside the Server Action. UI visibility is not treated as authorization. Zod schemas bound text, identifiers, prices, stock, slugs, and booleans. Image values come from a fixed local allow-list, so the feature does not introduce uploads, remote fetches, or stored arbitrary URLs.

Administrative stock setting uses the existing inventory service and includes the quantity observed by the form. A stale write fails before changing stock or creating a movement. Products and variants are archived instead of deleted, and a category with visible products cannot be deactivated. Catalogue actions return safe operational messages and do not expose database diagnostics or secrets.

## Guest cart boundary

Guest cart storage is untrusted browser input. The persisted value contains only a schema version, variant UUIDs, and quantities—never money, product authority, personal data, or secrets. Malformed JSON, unsupported versions, invalid quantities, duplicate overflow, and excessive carts recover to a safe empty state.

The cart resolver repeats server-side validation and discards unknown fields. PostgreSQL supplies current visibility, variant activity, stock constraints, prices, names, and images. All monetary calculations use integer cents. Cart resolution never mutates stock, writes inventory movements, or creates orders, payments, or customer records.

## Guest checkout boundary

Checkout treats contact, address, cart, and all extra client fields as hostile input. Zod validates and normalizes bounded guest fields, while the server independently re-resolves PostgreSQL visibility, availability, quantities, and prices. Shipping, tax, and total amounts are calculated only from current server data; client-supplied commerce values are ignored.

Checkout previews are stateless. Payment initiation persists email and address only as an order snapshot, uses bounded bodies and same-origin checks, and never logs the request. The existing database limiter is reused with a checkout-specific HMAC identity namespace; raw email and source values are not stored. Attempt tokens are also stored only as HMAC digests.

Stripe secret and webhook keys remain server-only. The adapter accepts only `sk_test_` keys, rejects live-mode sessions and events, and does not need the publishable key for hosted Checkout. Metadata contains only internal order linkage. Raw webhook bodies, secrets, card data, and full addresses are never logged. The success route reads database state and clears the browser cart only after verified PAID/PROCESSING state.

## Guest order lookup

Order references are identifiers, not credentials. Public details require both the normalized reference and exact normalized checkout email. HMAC comparisons reduce value-dependent comparison behavior, and missing orders use the same proof path and generic response as incorrect email. Source and proof-pair limits use the existing PostgreSQL fixed-window table with HMAC-only keys; raw email, reference, and source values are not retained in rate-limit records.

Successful verification issues a signed 15-minute HttpOnly, SameSite session cookie scoped to `/orders` and one internal order id. The details route queries by that scope and constant-time compares the route reference before mapping an explicit public DTO. Email, full address, SKU, database ids, Stripe ids, issue messages, and status-event notes are excluded. Street address is omitted, recipient and postal code are masked, and pages are marked noindex.

Email plus order reference is lightweight guest verification. Anyone with access to both values can view the limited order summary. Maison Vale does not yet have email delivery infrastructure, so one-time email links or codes are deferred as the preferred stronger ownership check. Trusted production proxies must normalize client-address headers used by rate limiting.

## Administrative authentication

TASK-003 implements Auth.js credentials authentication with eight-hour encrypted JWT sessions. Only user id and role are added to the session. Passwords are hashed with bcrypt using 12 rounds; inputs are normalized and validated with Zod; inactive users and invalid credentials receive the same public response. A dummy bcrypt comparison reduces account-existence timing differences.

Every protected page resolves the session and rechecks id, role, and active state from PostgreSQL. ADMIN-only and explicitly shared ADMIN/STAFF access use reusable server-side role helpers. There is no registration route.

Login attempts use a 15-minute fixed window with five allowed attempts. The stored bucket key is an HMAC-SHA256 digest of normalized email and request source using `RATE_LIMIT_SECRET`; raw identifiers are not stored. Missing secrets and database failures deny authentication. Auth logs omit credentials and expected invalid-credential details.

Auth.js trusts the host supplied by the deployment platform. Production must retain the documented Vercel topology or otherwise validate and normalize forwarded host and client-address headers at the trusted proxy boundary.
