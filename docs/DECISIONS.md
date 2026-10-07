# Decision log

## Agreed

- V1 uses guest checkout; customer accounts are out of scope.
- Stripe integration will use test mode initially.
- PostgreSQL is the target relational database.
- Payment state and fulfillment/order state are separate concepts.
- Vercel and Supabase are the target production platforms.
- The database and server are authoritative for inventory and totals.

## Unresolved

Inventory reservation timing, guest cart persistence, shipping/address structure, tax treatment, refund representation, currency scope, and the exact authentication/session approach remain open. These must be resolved before the relevant implementation tasks.
