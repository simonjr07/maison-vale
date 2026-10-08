# Product requirements

## Purpose

Maison Vale is a fictional premium lifestyle and apparel e-commerce platform used to demonstrate production-minded commerce engineering.

## Users and goals

- Customers should be able to discover products, understand variants and availability, complete a guest purchase, and safely look up an order.
- Administrators should be able to manage products, variants, inventory, orders, and basic commerce reporting through a protected dashboard.

## V1 scope

Product catalogue, categories and collections, product detail and variants, server-controlled inventory, guest cart and checkout, Stripe test-mode payments, webhook-driven payment records, orders, secure public order lookup, authenticated admin operations, responsive UI, accessibility, testing, and deployment documentation.

## Explicit non-goals

Customer accounts, wishlists, reviews, loyalty points, marketplace functionality, subscriptions, advanced coupons, advanced shipping integrations, international tax automation, multiple storefronts, and multiple currencies unless later approved.

## Journeys and rules

Primary journeys are browse → inspect product → choose variant → cart → checkout → payment → confirmation/order lookup, and admin sign-in → manage catalogue/inventory → process orders.

The browser is never proof of payment. Stripe webhooks are authoritative for payment events; payment and fulfillment states remain separate. Order prices are snapshotted, inventory is protected server-side, and inventory must never become negative.

## Operational expectations

The UI must be keyboard usable, readable at zoom, provide clear focus and error states, and work across small mobile and larger desktop viewports. Privacy-sensitive responses should reveal only what the user needs.

Preliminary order lifecycle: pending payment → paid/fulfillment pending → processing → shipped → fulfilled, with cancelled and refunded paths to be refined. Preliminary payment lifecycle: pending → succeeded, failed, or refunded, with webhook retries and idempotency.

## Implemented catalogue behavior

TASK-004 provides public product and category browsing, product details, ordered images, honest variant pricing, and advisory availability labels. Public visibility requires active and published products in active categories. Availability is not a reservation and must be validated again when checkout is implemented.

TASK-005 makes variant stock authoritative through validated server-side mutations, atomic sufficient-stock decrements, and transactional movement history. Cart additions do not reserve stock; checkout revalidates purchasability and uses the inventory service.

TASK-010 provides searchable, paginated product operations; product and variant create/edit/archive flows; curated local image selection; safe category management; and concurrency-aware stock setting with movement history. ADMIN users may mutate catalogue state, while STAFF users receive read-only operational visibility. Archival preserves order and inventory history, and publication changes flow through the same storefront visibility rules used by public queries.

Product details present variant-aware availability with exact counts only when ten or fewer units remain. Sold-out variants remain visible for clarity but cannot be added. Successful additions stay on the product page and provide an accessible `Added to bag` confirmation with a direct bag link. These messages are advisory; cart resolution and checkout independently validate current stock.

TASK-013 supplies complete, optimized local product photography for every public seeded colourway, with accessible galleries that follow colour selection while size-only variants reuse imagery. The storefront must remain usable from 320 px through wide desktop layouts, at 200% zoom, with keyboard-visible focus, skip navigation, clear landmarks, meaningful image alternatives, and reduced-motion support. Checkout and order status pages are excluded from indexing; no visual treatment may weaken payment, inventory, privacy, authentication, or authorization rules.

TASK-006 provides a browser-persisted guest cart, variant selection, quantity updates, removal, current server-resolved pricing, and clear stale-item handling. The cart is a convenience layer: it stores no authoritative price or stock value and does not reserve inventory.

TASK-007 provides a U.S.-only guest checkout form and a stateless server preparation boundary. PostgreSQL prices and availability are re-resolved independently from the cart page. Standard shipping is $8 below $150 and free at or above $150; automated tax remains explicitly unavailable and authoritative tax is $0. Validation creates no order, payment, customer profile, reservation, inventory movement, or stored address.

TASK-008 creates pending order, item, and payment snapshots before redirecting to card-only Stripe-hosted Checkout in test mode. Signed webhooks are payment authority. Successful paid events atomically commit inventory and advance the order; duplicate delivery is harmless. With no reservation, paid orders that can no longer commit stock remain pending with an explicit manual-review condition rather than entering fulfillment or reporting a false payment failure.

TASK-009 adds guest order lookup using the order reference and exact checkout email, followed by a short-lived session scoped to one order. It presents recorded item snapshots, totals, payment and fulfillment states, safe history, and a masked destination without exposing full contact, address, provider, or diagnostic data. This is lightweight guest verification; email-code ownership verification remains future work.

TASK-011 provides protected order search and full operational details for ADMIN and STAFF users. Only ADMIN may record fulfillment changes. The supported manual sequence is verified paid `PROCESSING → SHIPPED → DELIVERED`; each transition is concurrency-safe and adds one status event containing the administrator identity. `SHIPPED` means an administrator confirmed physical dispatch, and `DELIVERED` means an administrator recorded delivery manually. Neither state is carrier-verified. Payment exceptions, unpaid orders, and inventory-review orders are locked from fulfillment advancement.

TASK-012 provides a protected, read-only commerce dashboard for ADMIN and STAFF users. It reports verified gross sales, persisted refunds, net sales, distinct paid orders, average paid order value, payment/inventory exceptions, snapshot-based top variants, and current low-stock or sold-out variants. Periods are defined in UTC as 7, 30, or 90 inclusive calendar days, plus all time. Financial reporting excludes pending and failed payments and clearly identifies all Stripe activity as sandbox data.

TASK-014 hardens production boundaries without expanding commerce behavior. Browser payment initiation and guest lookup require the canonical origin, request bodies are byte-bounded, rate limits include source-wide abuse ceilings, trusted proxy data is deployment-specific, hosted PostgreSQL requires encrypted transport, and sensitive responses use private cache policy and security headers. Operational scripts are explicitly gated, configuration is checked without disclosing values, and hosted claims remain subject to the TASK-015 evidence checklist. Stripe remains sandbox-only.

Cancellation, automated or administrative refunds, automatic restocking, carrier tracking, and delivery estimates remain deferred because the current schema and business rules do not support them safely.
