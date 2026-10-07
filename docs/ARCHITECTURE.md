# Architecture

## Current state

The repository contains a Next.js App Router foundation and a PostgreSQL/Prisma data layer. PostgreSQL 17 runs locally through Docker Compose. Prisma ORM 7 uses a generated client and the PostgreSQL driver adapter; `src/server/db/client.ts` is marked server-only and caches the client during development hot reloads.

The database schema and migration exist, but no storefront, authentication, payment, cart, checkout, or admin behavior is implemented.

## Intended shape

```text
Browser → Next.js application → server-side domain/services → Prisma → PostgreSQL
                                      └──────────────→ Stripe API
Stripe → webhook route → verification/idempotency → application → PostgreSQL
```

UI components should handle presentation and user interaction. Server actions or route handlers should validate input and establish the request boundary. Domain services should own pricing, inventory, order, and payment rules. Persistence adapters should own Prisma/database access. Authentication and authorization must be enforced on the server. Stripe integration should be isolated from general domain logic, and webhook processing must verify signatures and be idempotent.

Runtime database access uses `DATABASE_URL`; migration commands use `DIRECT_URL`. Generated Prisma code is not committed. Domain services, server-action boundaries, and route handlers will be introduced with their respective feature tasks.
