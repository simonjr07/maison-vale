# API and server-boundary conventions

Auth.js route handlers are exposed at `/api/auth/*`; no commerce API endpoints are implemented. The login Server Action validates credentials with Zod and returns a single generic authentication failure message. Protected pages and future actions use the centralized authorization data-access layer rather than client-provided identity or role values.

Public catalogue pages use server-only functions in `src/server/catalogue/catalogue.ts`: `getPublishedProducts`, `getPublishedProductBySlug`, `getActiveCategories`, and `getPublishedProductsByCategory`. These functions enforce active and published visibility in PostgreSQL and return explicit public DTOs. Missing, inactive, and unpublished product or category slugs resolve to the storefront not-found state.

Inventory is not exposed through a public endpoint. Server-side callers use `increaseInventory`, `decreaseInventory`, `setInventory`, or `adjustInventory`. Commands validate UUIDs, whole-number quantities, bounded stock levels, reasons, and optional reference pairs. Callers receive domain errors for invalid commands, missing or unavailable variants, unavailable products, insufficient stock, limits, concurrency conflicts, and database failure; raw Prisma and SQL errors are not part of the contract.

`decreaseInventory` is the future purchase-authority path. Its database predicate requires an active variant, active and published product, and sufficient current stock. A successful mutation and its audit movement commit together. Future checkout code must use this operation and revalidate stock even when catalogue or cart UI previously showed availability.

The server calculates authoritative prices, discounts, shipping, tax, and totals. Client-supplied totals and availability are advisory only. Payment endpoints should use idempotency keys where a retry could create a duplicate effect. Stripe webhooks must verify the raw-body signature before parsing or processing events, then record event identity and process idempotently.

Expected safeguards include rate limiting for authentication, checkout, webhooks, and public order lookup; DTOs with explicit response allow-lists; conservative logging; and no secrets in browser bundles or responses.
