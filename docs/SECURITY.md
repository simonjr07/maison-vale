# Security boundaries

Stripe webhook signatures are verified from the untouched raw body before event data is used. Prices, shipping, tax, order snapshots, payment expectations, and inventory remain server-authoritative. Public order lookup must still resist enumeration and reveal minimal data in TASK-009.

Secrets belong in environment configuration and must never reach browser bundles, source control, logs, or error responses. Logs should omit payment credentials and unnecessary personal data. Same-origin and CSRF considerations must be reviewed for state-changing browser requests. Database constraints and transactions must preserve integrity, including non-negative inventory and idempotent payment events.

These are preliminary controls, not a compliance or penetration-testing claim.

The initial migration enforces non-negative inventory and monetary values, positive quantities/refunds, and consistent order arithmetic. These checks are a final database boundary, not a replacement for request validation or transactional application logic. The generated client is excluded from source control, and the runtime client is marked server-only to prevent accidental client-component imports.

## Inventory integrity

TASK-005 keeps stock authoritative at `ProductVariant`. Inventory commands are server-only and validated at runtime; individual adjustment quantities and explicit stock levels are capped at 100,000 units. Purchase-style decrements use an atomic conditional update, so concurrent callers cannot both consume the same final unit. PostgreSQL retains the non-negative stock check as a final boundary.

Every successful mutation writes a non-zero `InventoryMovement` in the same transaction. Failed mutations roll back without an audit row. Movement references must be supplied as a complete type/id pair, and existing history prevents variant deletion. Public availability remains advisory and exact quantities are not included in catalogue DTOs.

## Guest cart boundary

Guest cart storage is untrusted browser input. The persisted value contains only a schema version, variant UUIDs, and quantities—never money, product authority, personal data, or secrets. Malformed JSON, unsupported versions, invalid quantities, duplicate overflow, and excessive carts recover to a safe empty state.

The cart resolver repeats server-side validation and discards unknown fields. PostgreSQL supplies current visibility, variant activity, stock constraints, prices, names, and images. All monetary calculations use integer cents. Cart resolution never mutates stock, writes inventory movements, or creates orders, payments, or customer records.

## Guest checkout boundary

Checkout treats contact, address, cart, and all extra client fields as hostile input. Zod validates and normalizes bounded guest fields, while the server independently re-resolves PostgreSQL visibility, availability, quantities, and prices. Shipping, tax, and total amounts are calculated only from current server data; client-supplied commerce values are ignored.

Checkout previews are stateless. Payment initiation persists email and address only as an order snapshot, uses bounded bodies and same-origin checks, and never logs the request. The existing database limiter is reused with a checkout-specific HMAC identity namespace; raw email and source values are not stored. Attempt tokens are also stored only as HMAC digests.

Stripe secret and webhook keys remain server-only. The adapter accepts only `sk_test_` keys, rejects live-mode sessions and events, and does not need the publishable key for hosted Checkout. Metadata contains only internal order linkage. Raw webhook bodies, secrets, card data, and full addresses are never logged. The success route reads database state and clears the browser cart only after verified PAID/PROCESSING state.

## Administrative authentication

TASK-003 implements Auth.js credentials authentication with eight-hour encrypted JWT sessions. Only user id and role are added to the session. Passwords are hashed with bcrypt using 12 rounds; inputs are normalized and validated with Zod; inactive users and invalid credentials receive the same public response. A dummy bcrypt comparison reduces account-existence timing differences.

Every protected page resolves the session and rechecks id, role, and active state from PostgreSQL. ADMIN-only and explicitly shared ADMIN/STAFF access use reusable server-side role helpers. There is no registration route.

Login attempts use a 15-minute fixed window with five allowed attempts. The stored bucket key is an HMAC-SHA256 digest of normalized email and request source using `RATE_LIMIT_SECRET`; raw identifiers are not stored. Missing secrets and database failures deny authentication. Auth logs omit credentials and expected invalid-credential details.

Auth.js trusts the host supplied by the deployment platform. Production must retain the documented Vercel topology or otherwise validate and normalize forwarded host and client-address headers at the trusted proxy boundary.
