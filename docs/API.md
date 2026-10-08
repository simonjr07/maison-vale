# API and server-boundary conventions

Auth.js route handlers are exposed at `/api/auth/*`. Commerce request boundaries cover cart resolution, checkout preparation, Stripe Checkout Session creation, and Stripe webhooks. The login Server Action validates credentials with Zod and returns a single generic authentication failure message. Protected pages and future actions use the centralized authorization data-access layer rather than client-provided identity or role values.

Public catalogue pages use server-only functions in `src/server/catalogue/catalogue.ts`: `getPublishedProducts`, `getPublishedProductBySlug`, `getActiveCategories`, and `getPublishedProductsByCategory`. These functions enforce active and published visibility in PostgreSQL and return explicit public DTOs. Missing, inactive, and unpublished product or category slugs resolve to the storefront not-found state.

Inventory is not exposed through a public endpoint. Server-side callers use `increaseInventory`, `decreaseInventory`, `setInventory`, or `adjustInventory`. Commands validate UUIDs, whole-number quantities, bounded stock levels, reasons, and optional reference pairs. Callers receive domain errors for invalid commands, missing or unavailable variants, unavailable products, insufficient stock, limits, concurrency conflicts, and database failure; raw Prisma and SQL errors are not part of the contract.

`decreaseInventory` is the future purchase-authority path. Its database predicate requires an active variant, active and published product, and sufficient current stock. A successful mutation and its audit movement commit together. Future checkout code must use this operation and revalidate stock even when catalogue or cart UI previously showed availability.

`POST /api/cart/resolve` accepts a version 1 cart containing only variant UUIDs and requested quantities. It limits request size, distinct lines, per-line quantity, and total units; duplicate variants are merged during normalization. Unknown properties such as client-provided names, prices, and totals are discarded rather than used.

The response is an allow-listed USD cart DTO containing current public product and variant labels, image, current unit price, resolved quantity, integer-cent line total, status, customer-facing warning, and server-calculated subtotal. It does not expose SKU, raw stock quantity, publication flags, audit history, or admin data. Responses are not cached.

`POST /api/checkout/quote` accepts only the minimal versioned cart. It rejects empty, malformed, stale, out-of-stock, inactive, and hidden carts, then returns current public line data with authoritative subtotal, shipping, tax, and total values. `POST /api/checkout/prepare` accepts the cart plus guest email and U.S. shipping address. Zod trims and bounds fields, normalizes email, validates the fixed `US` country and ZIP format, and returns structured field or business errors.

Both checkout preview routes use bounded request bodies, no-store responses, integer-cent calculations, and allow-listed DTOs. Unknown client totals, prices, names, shipping, and tax values are discarded. Successful preparation creates no durable commerce state.

`POST /api/stripe/checkout-session` accepts the validated checkout shape plus a client-generated UUID attempt token. It applies the HMAC-backed database limiter, repeats authoritative checkout preparation, creates pending order/payment snapshots, and returns only an order number and Stripe-hosted redirect URL. Same-origin checks and a configured `APP_URL` constrain return URLs. Reusing an unchanged attempt returns the existing session; changing details with the same token is rejected.

`POST /api/stripe/webhook` reads the raw body, verifies `Stripe-Signature`, and handles only `checkout.session.completed`. Card is the only allowed V1 payment method. Valid duplicate events return success without repeating business changes; unexpected database failures return a non-2xx response for Stripe retry.

`/checkout/success` looks up the supplied Checkout Session id in PostgreSQL and renders confirmed, processing, review, or unverified state. The parameter itself is never payment proof. `/checkout/cancel` does not delete or fail pending records.

`POST /api/orders/lookup` accepts an order reference and checkout email through a bounded, same-origin request. Both values are normalized with Zod. HMAC-backed PostgreSQL limits apply independently to the request source and proof pair. Missing orders and incorrect emails return the same public denial. A successful match sets a 15-minute HttpOnly, SameSite cookie scoped to `/orders`; the access token is never returned to application JavaScript or placed in a URL.

`/orders/[orderNumber]` reads the signed order scope before querying by internal order id. The route reference must match the scoped record, so changing the URL cannot cross into another order. The allow-listed response omits email, street address, SKU, internal ids, provider identifiers, diagnostic metadata, and internal notes. It exposes only recorded item snapshots, totals, masked destination, mapped payment/fulfillment states, and safe status-event dates.

The server calculates authoritative prices, discounts, shipping, tax, and totals. Client-supplied totals and availability are advisory only. Payment endpoints should use idempotency keys where a retry could create a duplicate effect. Stripe webhooks must verify the raw-body signature before parsing or processing events, then record event identity and process idempotently.

Expected safeguards include rate limiting for authentication, checkout, webhooks, and public order lookup; DTOs with explicit response allow-lists; conservative logging; and no secrets in browser bundles or responses.
