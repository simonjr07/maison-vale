# Architecture

## Current state

The repository contains a Next.js App Router application, PostgreSQL/Prisma data layer, administrative authentication boundary, and public product catalogue. PostgreSQL 17 runs locally through Docker Compose. Prisma ORM 7 uses a generated client and the PostgreSQL driver adapter; `src/server/db/client.ts` is marked server-only and caches the client during development hot reloads.

Auth.js provides credentials authentication with encrypted JWT sessions. The credentials service validates and normalizes input, consumes a database-backed login-rate bucket, verifies bcrypt hashes, and returns only user id and role. The authorization data-access layer rechecks the current user in PostgreSQL before protected pages or operations proceed.

The `/admin/login` route is public. The route-grouped `/admin` shell is protected without changing its URL. Authentication answers who the user is; reusable role guards separately decide what ADMIN and STAFF users may do.

The route-grouped storefront exposes `/`, `/shop`, `/shop/[slug]`, and `/collections/[slug]`. UI components call the centralized server-only catalogue data-access module instead of Prisma. Queries select only the fields needed for public presentation, and pure mapping functions produce allow-listed DTOs without database ids, SKUs, raw stock counts, or publication flags. Visibility requires an active, published product in an active category.

Catalogue pages read PostgreSQL at request time. They intentionally do not use a persistent application cache because stock labels are advisory and should reflect current variant records. React request memoization prevents duplicate product queries between metadata and page rendering. Cart, checkout, payment, and operational admin modules are not implemented.

Variant availability is centralized in the inventory domain and requires an active, published product, an active variant, and positive stock. The catalogue maps that domain result into public labels without exposing quantities. Runtime inventory commands pass through Zod validation and the server-only inventory service. Stock changes and `InventoryMovement` audit rows share a database transaction.

Purchase-style decrements use one conditional PostgreSQL update that includes the required stock quantity and product/variant visibility predicates. This avoids a read-check-write race. Restocks are bounded, while intentional stock-setting uses the previously observed quantity as an optimistic concurrency condition. Future cart code must not reserve stock; future checkout and order processing must call this inventory service rather than update variants directly.

## Intended shape

```text
Browser → Next.js application → server-side domain/services → Prisma → PostgreSQL
                                      └──────────────→ Stripe API
Stripe → webhook route → verification/idempotency → application → PostgreSQL
```

UI components should handle presentation and user interaction. Server actions or route handlers should validate input and establish the request boundary. Domain services should own pricing, inventory, order, and payment rules. Persistence adapters should own Prisma/database access. Authentication and authorization must be enforced on the server. Stripe integration should be isolated from general domain logic, and webhook processing must verify signatures and be idempotent.

Runtime database access uses `DATABASE_URL`; migration commands use `DIRECT_URL`. Generated Prisma code is not committed. Future server-action boundaries and route handlers will be introduced with their respective feature tasks.
