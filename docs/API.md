# API and server-boundary conventions

Auth.js route handlers are exposed at `/api/auth/*`. Commerce request boundaries cover cart resolution, checkout preparation, Stripe Checkout Session creation, and Stripe webhooks. The login Server Action validates credentials with Zod and returns a single generic authentication failure message. Protected pages and future actions use the centralized authorization data-access layer rather than client-provided identity or role values.

Public catalogue pages use server-only functions in `src/server/catalogue/catalogue.ts`: `getPublishedProducts`, `getPublishedProductBySlug`, `getActiveCategories`, and `getPublishedProductsByCategory`. These functions enforce active and published visibility in PostgreSQL and return explicit public DTOs. Missing, inactive, and unpublished product or category slugs resolve to the storefront not-found state.

Product-detail variant DTOs include the existing coarse availability state plus a server-derived `stockMessage`. It returns `In stock` above ten units, a bounded exact low-stock message from one through ten, `Sold out` at zero, or `Unavailable` when catalogue visibility rules fail. Raw stock quantities, SKUs, and administrative fields remain omitted. This message is informational; cart and checkout requests independently re-read authoritative inventory.

Administrative catalogue changes use authenticated Server Actions under the protected `/admin` route group rather than a public JSON API. Every action rechecks an active ADMIN account, validates a bounded allow-listed payload with Zod, calls the admin domain service, and revalidates affected admin and storefront paths. STAFF users have read-only access. Inputs never accept arbitrary image URLs, direct stock deltas, or client-supplied database records.

Product creation writes the product, first zero-stock variant, and optional curated image in one transaction. Product edits replace the single managed primary image atomically. Variant and category changes preserve relational history, and archive actions set availability flags rather than deleting rows. Exact stock-setting delegates to the TASK-005 inventory service with the page’s observed quantity as an optimistic concurrency condition.

Administrative order reads and mutations also use protected Server Actions rather than a public order-management API. `searchOrdersAction` accepts a bounded search term, fulfillment filter, payment filter, and page number after rechecking an active ADMIN or STAFF user. Search results include only operational fields and are returned over the action response; customer email is never placed in the URL. `transitionOrderAction` rechecks ADMIN authority and accepts only the order UUID, expected current state, and allow-listed target state.

Supported transition pairs are `PROCESSING → SHIPPED` and `SHIPPED → DELIVERED`. The server rejects unpaid, refunded, failed, exception, stale, skipped, repeated, or unsupported transitions. Payment records cannot be edited by these actions. There are no cancellation, refund, restock, carrier, or tracking mutation contracts in TASK-011.

Administrative analytics has no public endpoint or mutation contract. The protected `/admin` Server Component accepts only the allow-listed `period` query value (`7d`, `30d`, `90d`, or `all`) and falls back to 30 days for malformed or repeated input. Its server-only service returns aggregate monetary values, counts, trend buckets, immutable item-snapshot rankings, and minimal current inventory alerts. It never returns customer contact/address fields, provider identifiers, webhook rows, or internal issue messages.

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
