# Database foundation

## Implemented in TASK-002

Maison Vale uses PostgreSQL 17 with Prisma ORM 7. Runtime queries use `DATABASE_URL` through `@prisma/adapter-pg`; Prisma CLI migrations use `DIRECT_URL` through the root `prisma.config.ts` file. The initial migration is tracked in `prisma/migrations`.

The current schema contains:

- `User` for future ADMIN and STAFF authentication only.
- `Category`, `Product`, `ProductVariant`, and `ProductImage` for the catalogue foundation.
- `InventoryMovement` for immutable variant-level stock adjustment history.
- `Order` and `OrderItem` with guest contact, address, product, variant, SKU, and price snapshots.
- `Payment` and `Refund`, separate from fulfillment status.
- `OrderStatusEvent` for order-history records.
- `StripeWebhookEvent` as the future webhook idempotency ledger.
- `StoreSettings` for the store name and V1 currency.
- `LoginRateLimitBucket` for fixed-window administrative login throttling.

Inventory belongs to `ProductVariant`. Each authoritative change records a signed `InventoryMovement.quantityDelta`, reason, and optional reference pair in the same transaction. Money uses integer cents and V1 currency is constrained to USD. Order addresses are immutable order data rather than reusable customer-address records. The optional order-item relation to a variant may be cleared while the snapshot remains intact.

## Integrity constraints

Unique constraints protect user email, category and product slugs, SKU, order number, provider payment identity, provider refund identity, and Stripe event identity. Foreign keys define explicit delete behavior and query-oriented indexes cover catalogue, inventory, order, payment, and event access paths.

The initial SQL migration adds checks for non-negative variant prices, stock, order totals, payment amounts, and image sort order; positive quantities and refund amounts; and internally consistent order and line totals. Application transactions will still be required for concurrent inventory changes.

The TASK-003 migration adds a unique HMAC-key/window pair, expiration index, and non-negative attempt constraint for login rate limiting. Buckets intentionally store no raw email address or client address. `npm run rate-limits:cleanup` reports expired rows without deleting them; an authorized scheduled maintenance job may use `npm run rate-limits:cleanup -- --apply`.

The TASK-005 migrations add the inventory movement ledger, reason enum, variant/date and reference indexes, a non-zero delta check, and a paired-reference check. Movement rows restrict variant deletion so audit history cannot disappear through a catalogue cascade. TASK-010 introduces no schema migration: administrative workflows archive products and variants with existing activity/publication flags, and stock auditability continues through `InventoryMovement`.

## Seed data

The idempotent development seed creates one StoreSettings record, four active categories, eight public products, two hidden visibility fixtures, twenty-two variants, and ordered local product-image records. The catalogue includes in-stock, out-of-stock, unavailable, exact-price, and variable-price examples. New variants receive their curated starting stock, but later seed runs preserve existing stock so local adjustments are not silently erased. The seed creates no inventory movements, staff user, or credentials.

## TASK-008 payment persistence

The payment migration adds an HMAC checkout-attempt identity and request fingerprint to `Order`; provider Checkout Session id, observed provider amount/currency, and safe failure metadata to `Payment`; and an outcome code to `StripeWebhookEvent`. Unique attempt, Checkout Session, and Stripe event indexes provide durable retry boundaries. Order payment-issue fields record paid-but-not-fulfillable exceptions without falsifying payment status.

Order and item rows are checkout snapshots. Successful webhook finalization updates payment, inventory, inventory movements, order status, order status history, and webhook outcome atomically. Insufficient stock rolls that transaction back before a separate transaction records payment truth and the operational exception.

TASK-011 adds no schema migration. Manual dispatch and delivery reuse `Order.status` and append immutable `OrderStatusEvent` rows in the same transaction as each conditional status update. The event note records the acting administrator and explicitly distinguishes manual confirmation from carrier verification. Historical `OrderItem` snapshots, payments, refunds, totals, and inventory records are read-only to this workflow.

TASK-009 adds no order schema or mutable lookup record. Signed lookup scope remains in a short-lived HttpOnly cookie. Existing `LoginRateLimitBucket` rows are reused with domain-separated HMAC identities for request-source and proof-pair limits; raw lookup inputs are not stored.

TASK-012 adds no schema migration. Analytics reads existing `Payment`, `Refund`, `Order`, `OrderItem`, and `ProductVariant` records. Gross sales use the persisted provider-observed integer-cent amount on verified USD payment records; top variants use immutable order-item names, variant names, SKUs, quantities, and line totals. `StripeWebhookEvent` is not joined into revenue queries, so retries and duplicate webhook ledger rows cannot multiply sales. Current stock alerts remain a separate live operational measure.

## Deferred decisions

The guest cart and TASK-007 preparation remain stateless. TASK-008 does not reserve stock. Production tax automation, abandoned-pending-order cleanup, refunds, partial-refund policy, product archival workflows, and production pool sizing remain future decisions.

TASK-014 adds no migration. Production `DATABASE_URL` and `DIRECT_URL` values for non-local PostgreSQL hosts must request TLS with `sslmode=require`, `verify-ca`, or `verify-full`. The runtime database role should have only the DML permissions the application needs; a separate migration role may hold DDL privileges. Supabase deployments should use the supported pooled runtime connection for application traffic and the direct connection for reviewed migrations.
