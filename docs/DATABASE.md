# Database foundation

## Implemented in TASK-002

Maison Vale uses PostgreSQL 17 with Prisma ORM 7. Runtime queries use `DATABASE_URL` through `@prisma/adapter-pg`; Prisma CLI migrations use `DIRECT_URL` through the root `prisma.config.ts` file. The initial migration is tracked in `prisma/migrations`.

The current schema contains:

- `User` for future ADMIN and STAFF authentication only.
- `Category`, `Product`, `ProductVariant`, and `ProductImage` for the catalogue foundation.
- `Order` and `OrderItem` with guest contact, address, product, variant, SKU, and price snapshots.
- `Payment` and `Refund`, separate from fulfillment status.
- `OrderStatusEvent` for order-history records.
- `StripeWebhookEvent` as the future webhook idempotency ledger.
- `StoreSettings` for the store name and V1 currency.

Inventory belongs to `ProductVariant`. Money uses integer cents and V1 currency is constrained to USD. Order addresses are immutable order data rather than reusable customer-address records. The optional order-item relation to a variant may be cleared while the snapshot remains intact.

## Integrity constraints

Unique constraints protect user email, category and product slugs, SKU, order number, provider payment identity, provider refund identity, and Stripe event identity. Foreign keys define explicit delete behavior and query-oriented indexes cover catalogue, inventory, order, payment, and event access paths.

The initial SQL migration adds checks for non-negative variant prices, stock, order totals, payment amounts, and image sort order; positive quantities and refund amounts; and internally consistent order and line totals. Application transactions will still be required for concurrent inventory changes.

## Seed data

The idempotent development seed creates one StoreSettings record, the Everyday Objects category, the unpublished Vale Carryall product, and two variants. It creates no staff user or credentials.

## Deferred decisions

Guest cart persistence remains deferred to TASK-006. Transactional stock decrement timing will be finalized with checkout and payments. Tax calculation, shipping rates, partial-refund policy, product archival workflows, and production pool sizing remain future decisions.
