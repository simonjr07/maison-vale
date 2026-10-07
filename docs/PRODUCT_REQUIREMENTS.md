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

TASK-005 makes variant stock authoritative through validated server-side mutations, atomic sufficient-stock decrements, and transactional movement history. Cart additions will not reserve stock; checkout must revalidate purchasability and use the inventory service.

TASK-006 provides a browser-persisted guest cart, variant selection, quantity updates, removal, current server-resolved pricing, and clear stale-item handling. The cart is a convenience layer: it stores no authoritative price or stock value and does not reserve inventory.

Checkout, payment, order lookup, and operational catalogue management remain future work.
