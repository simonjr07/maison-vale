# Architecture

## Current state

The repository currently contains a Next.js App Router, React, TypeScript, Tailwind CSS, a foundation page, and documentation. There is no database, authentication, payment integration, or commerce domain code yet.

## Intended shape

```text
Browser → Next.js application → server-side domain/services → Prisma → PostgreSQL
                                      └──────────────→ Stripe API
Stripe → webhook route → verification/idempotency → application → PostgreSQL
```

UI components should handle presentation and user interaction. Server actions or route handlers should validate input and establish the request boundary. Domain services should own pricing, inventory, order, and payment rules. Persistence adapters should own Prisma/database access. Authentication and authorization must be enforced on the server. Stripe integration should be isolated from general domain logic, and webhook processing must verify signatures and be idempotent.

The exact module layout and server-action versus route-handler choices remain open until the database foundation is designed.
