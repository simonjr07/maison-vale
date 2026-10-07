# Decision log

## Agreed

- V1 uses guest checkout; customer accounts are out of scope.
- Stripe integration will use test mode initially.
- PostgreSQL is the target relational database.
- Payment state and fulfillment/order state are separate concepts.
- Vercel and Supabase are the target production platforms.
- The database and server are authoritative for inventory and totals.
- Prisma ORM 7 uses `@prisma/adapter-pg`; runtime and migration connections are separated through `DATABASE_URL` and `DIRECT_URL`.
- V1 supports USD only and stores money as integer cents.
- Inventory is held by product variants, cannot be negative, and has no reservation system in V1.
- Guest order addresses and order-item commerce details are snapshots.
- Refunds use explicit payment/refund records rather than fulfillment status.
- Local PostgreSQL 17 is exposed on host port 5435 through Docker Compose.
- Administrative authentication uses Auth.js credentials with encrypted JWT sessions lasting eight hours.
- Passwords use bcrypt with 12 rounds and are never returned by authorization helpers.
- Protected operations recheck the active user and role in PostgreSQL rather than trusting JWT role claims alone.
- Both ADMIN and STAFF may access the base admin shell; ADMIN-only operations require an explicit role guard.
- Login rate limiting uses database fixed-window buckets keyed by a secret-backed HMAC digest.
- Administrative users are provisioned only through an explicit local command; public registration is out of scope.

## Unresolved

Transactional inventory decrement timing, guest cart persistence, shipping-rate logic, tax calculation, partial-refund policy, production pool sizing, staff permission mapping for future modules, and password recovery/rotation operations remain open. These must be resolved before the relevant implementation tasks.
