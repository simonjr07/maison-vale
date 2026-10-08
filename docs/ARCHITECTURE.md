# Architecture

## Current state

The repository contains a Next.js App Router application, PostgreSQL/Prisma data layer, administrative authentication boundary, and public product catalogue. PostgreSQL 17 runs locally through Docker Compose. Prisma ORM 7 uses a generated client and the PostgreSQL driver adapter; `src/server/db/client.ts` is marked server-only and caches the client during development hot reloads.

Auth.js provides credentials authentication with encrypted JWT sessions. The credentials service validates and normalizes input, consumes a database-backed login-rate bucket, verifies bcrypt hashes, and returns only user id and role. The authorization data-access layer rechecks the current user in PostgreSQL before protected pages or operations proceed.

The `/admin/login` route is public. The route-grouped `/admin` shell is protected without changing its URL. Authentication answers who the user is; reusable role guards separately decide what ADMIN and STAFF users may do.

The route-grouped storefront exposes `/`, `/shop`, `/shop/[slug]`, `/collections/[slug]`, `/cart`, and `/checkout`. UI components call centralized server-only data modules instead of Prisma. Queries select only the fields needed for public presentation, and pure mapping functions produce allow-listed DTOs without database ids, SKUs, raw stock counts, or publication flags. Visibility requires an active, published product in an active category.

Catalogue pages read PostgreSQL at request time. They intentionally do not use a persistent application cache because stock labels are advisory and should reflect current variant records. React request memoization prevents duplicate product queries between metadata and page rendering. Test-mode payment, order creation, public order lookup, and administrative catalogue operations are implemented; order administration and analytics remain deferred.

Variant availability is centralized in the inventory domain and requires an active, published product, an active variant, and positive stock. The catalogue maps that domain result into public labels without exposing quantities. Runtime inventory commands pass through Zod validation and the server-only inventory service. Stock changes and `InventoryMovement` audit rows share a database transaction.

Product details add a deliberately narrow stock signal: exact remaining quantity is disclosed only in the low-stock range of one through ten, while larger quantities remain `In stock`. Variant switching and add-to-bag feedback are client interactions over that server-derived DTO. Before browser cart state is saved, `/api/cart/resolve` independently validates current product visibility, price, and stock; the display is never an inventory reservation or checkout authority.

Purchase-style decrements use one conditional PostgreSQL update that includes the required stock quantity and product/variant visibility predicates. This avoids a read-check-write race. Restocks are bounded, while intentional stock-setting uses the previously observed quantity as an optimistic concurrency condition. The cart does not reserve stock; future checkout and order processing must call this inventory service rather than update variants directly.

The protected admin catalogue separates reads from writes. Active ADMIN and STAFF users may inspect products, variants, categories, stock, and recent movement history. Every mutation is an independently authenticated Server Action restricted to ADMIN. Product creation is transactional, variant records begin at zero stock, and all stock changes route through the inventory service with an expected-quantity concurrency guard and an `InventoryMovement` written in the same transaction. Products and variants are archived, not deleted. Image selection is restricted to reviewed local catalogue assets.

The guest cart is a narrow client-side layer under the storefront route group. `CartProvider` loads and validates a versioned `localStorage` payload after hydration, persists only variant ids and quantities, synchronizes browser tabs, and supplies the total-unit navigation count. Server Components remain responsible for the surrounding storefront and product data; client components are limited to cart state, variant selection, and quantity interactions.

`POST /api/cart/resolve` is the server boundary for cart presentation. It validates and normalizes the minimal payload, queries all requested variants in one database call, applies the centralized inventory availability rule, selects current images and prices, and calculates integer-cent line totals and subtotal. No cart operation reserves or decrements stock. Stale quantities are clamped to current availability with an explicit warning, while unavailable lines remain visible and removable but contribute zero to subtotal.

The checkout preview routes remain stateless. `POST /api/stripe/checkout-session` repeats validation and cart resolution, snapshots a pending order and payment, and creates a card-only Stripe-hosted Checkout Session from server amounts. A client UUID is stored only as an HMAC and paired with a request fingerprint; retries reuse the internal order and Stripe idempotency key.

V1 checkout uses deterministic U.S.-only standard shipping: $8 below a $150 merchandise subtotal and free shipping at or above $150. Automated tax calculation is deferred, so the explicit authoritative tax amount is $0.

`POST /api/stripe/webhook` verifies Stripe's signature against the untouched request body. A unique `StripeWebhookEvent` claim and an atomic payment-state claim make repeated and concurrent delivery safe. A valid paid session must match the stored session, order metadata, amount, and currency. Payment, conditional inventory decrements, movement records, the PENDING-to-PROCESSING transition, and its status event share one PostgreSQL transaction.

V1 intentionally has no reservation. If stock cannot be committed after Stripe has collected payment, the fulfillment transaction rolls back. A separate durable transaction records the payment as PAID and leaves the order PENDING with `PAID_REQUIRES_INVENTORY_REVIEW`; refund or manual resolution is deferred to the order operations work.

Guest order lookup is a read-only layer over the existing order, item, payment, and status-event snapshots. The lookup endpoint validates the reference/email proof, consumes two HMAC-keyed PostgreSQL rate-limit buckets, and sets a short-lived signed HttpOnly cookie. The dynamic order-details page reads that one-order scope before querying PostgreSQL and maps an allow-listed DTO with masked destination data. It never changes payment, fulfillment, inventory, or webhook state.

## Intended shape

```text
Browser → Next.js application → server-side domain/services → Prisma → PostgreSQL
                                      └──────────────→ Stripe API
Stripe → webhook route → verification/idempotency → application → PostgreSQL
```

UI components should handle presentation and user interaction. Server actions or route handlers should validate input and establish the request boundary. Domain services should own pricing, inventory, order, and payment rules. Persistence adapters should own Prisma/database access. Authentication and authorization must be enforced on the server. Stripe integration should be isolated from general domain logic, and webhook processing must verify signatures and be idempotent.

Runtime database access uses `DATABASE_URL`; migration commands use `DIRECT_URL`. Generated Prisma code is not committed. Future server-action boundaries and route handlers will be introduced with their respective feature tasks.
