# Decision log

## Agreed

- V1 uses guest checkout; customer accounts are out of scope.
- Stripe integration will use test mode initially.
- PostgreSQL is the target relational database.
- Payment state and fulfillment/order state are separate concepts.
- Vercel and Supabase are the target production platforms.
- The database and server are authoritative for inventory and totals.
- Prisma ORM 7 uses `@prisma/adapter-pg`; runtime and migration connections are separated through `DATABASE_URL` and `DIRECT_URL`.
- V1 supports USD only and stores money as integer cents.
- Inventory is held by product variants, cannot be negative, and has no reservation system in V1.
- Guest order addresses and order-item commerce details are snapshots.
- Refunds use explicit payment/refund records rather than fulfillment status.
- Local PostgreSQL 17 is exposed on host port 5435 through Docker Compose.
- Administrative authentication uses Auth.js credentials with encrypted JWT sessions lasting eight hours.
- Passwords use bcrypt with 12 rounds and are never returned by authorization helpers.
- Protected operations recheck the active user and role in PostgreSQL rather than trusting JWT role claims alone.
- Both ADMIN and STAFF may access the base admin shell; ADMIN-only operations require an explicit role guard.
- Login rate limiting uses database fixed-window buckets keyed by a secret-backed HMAC digest.
- Administrative users are provisioned only through an explicit local command; public registration is out of scope.
- Public catalogue routes use request-time PostgreSQL reads rather than a persistent application cache so advisory stock labels do not inherit a revalidation delay.
- Product images use ordered database records that point to optimized repository-owned WebP photography. A code-owned presentation manifest maps reviewed paths to product colour and image role so variant galleries do not require a schema migration; upload infrastructure remains deferred.
- Public catalogue DTOs omit database ids, SKUs, raw stock quantities, and administrative visibility fields.
- V1 has no inventory reservation model. Cart contents are advisory; checkout must revalidate and atomically decrement stock.
- Inventory adjustments are recorded as immutable movement rows with a signed delta, reason, and optional paired reference fields.
- Purchase-style decrements use a single conditional update inside the movement transaction; intentional stock-setting uses optimistic concurrency.
- Seed reruns preserve stock on existing variants rather than overwriting local inventory changes.
- The V1 guest cart uses versioned `localStorage` and persists only variant ids and quantities. Browser state is treated as untrusted input.
- Cart navigation counts total units rather than distinct lines.
- Cart limits are 20 distinct lines, 20 units per line, and 50 units in total.
- Cart resolution always uses current PostgreSQL prices and availability. Excess quantities are visibly clamped; unavailable lines remain removable and are excluded from subtotal.
- Prices are not persisted. In-session refreshes can announce a price change; a later browser session simply receives and displays the current authoritative price.
- TASK-007 checkout is stateless and persists no guest contact or address data. It validates the request and returns an authoritative summary without creating an order or payment.
- V1 checkout ships only within the United States. Country is fixed to `US`, while state or region and a sensible five- or nine-digit ZIP are required.
- V1 standard shipping is $8 below a $150 merchandise subtotal and free at or above $150. The server calculates shipping in integer cents.
- Automated sales-tax calculation is outside V1 checkout foundation. The server returns `taxCents = 0`, and the limitation is disclosed in the UI.
- Checkout rejects stale quantities and unavailable lines rather than treating the cart page's earlier resolution as authority. It independently resolves current PostgreSQL state.
- TASK-008 uses card-only Stripe-hosted Checkout in test mode. An internal PENDING order and payment are created before redirect; a verified webhook is the only authority that records paid state and advances fulfillment.
- Checkout retries use a client UUID stored as an HMAC, a server request fingerprint, a unique order constraint, and the same Stripe idempotency key. Unchanged retries reuse one order and session.
- Inventory is not reserved or decremented at Session creation. A paid webhook rechecks and commits inventory inside the payment/order transaction.
- If stock is insufficient after payment, payment remains truthfully PAID, the order remains PENDING, and a safe operational issue requires manual refund or resolution. Automatic refunds are deferred.
- Stripe event ids are claimed in PostgreSQL, while an atomic payment-state claim also protects against different events for one Session.
- Cancelled or abandoned Checkout Sessions leave pending historical records. Expiry and cleanup are future operational work.
- Guest lookup requires order reference plus exact checkout email and then issues a 15-minute signed HttpOnly session scoped to one order. References alone never authorize access.
- Public order DTOs omit email, street address, SKU, internal/provider ids, issue messages, and internal status notes. Recipient and postal details are masked.
- Guest lookup is read-only and cannot alter payment, fulfillment, inventory, or webhook records.
- Email-plus-reference is accepted as lightweight V1 guest verification. Time-limited email codes or magic links are preferred future hardening when transactional email infrastructure exists.
- TASK-010 catalogue and inventory reads are available to active ADMIN and STAFF users. Product, variant, image, category, archive, and inventory mutations are ADMIN-only until a finer-grained staff permission model is defined.
- Administrative image management is limited to a primary image selected from a server allow-list of repository-owned catalogue assets. Editing that primary image preserves seeded supporting gallery views; explicitly choosing no image clears the gallery. Uploads and arbitrary external URLs remain deferred.
- New administrative variants start at zero stock. Opening stock and later corrections are separate optimistic-concurrency inventory operations so every change produces an immutable movement record.
- Public product details disclose exact stock only from one through ten units. Larger quantities use `In stock`, zero uses `Sold out`, and unavailable records expose no count. Cart and checkout remain authoritative and no display reserves stock.
- TASK-011 order reads are shared by active ADMIN and STAFF users; fulfillment writes are ADMIN-only. Customer-email search uses POST-backed Server Actions so PII does not enter admin URLs.
- V1 manual fulfillment supports only verified-paid `PROCESSING → SHIPPED → DELIVERED`. Each transition records the administrator email in an internal status note. `SHIPPED` means physical dispatch was manually confirmed, while `DELIVERED` is a manual operational confirmation; neither is carrier-verified.
- Cancellation, refunds, automatic restocking, tracking numbers, carrier events, and delivery estimates are not exposed by TASK-011. Existing cancellation/refund policy remains unresolved and payment truth remains webhook-controlled.
- TASK-012 analytics is read-only for active ADMIN and STAFF users and lives on the protected `/admin` overview. It introduces no reporting mutation or public API.
- Verified gross sales include the persisted provider-observed amount for current USD `PAID`, `PARTIALLY_REFUNDED`, and `REFUNDED` payment records by stable payment-record creation date. Refunds use persisted refund-record dates, so a period refund may relate to an earlier sale. Pending, failed, non-USD, and incomplete provider records are excluded.
- Financial windows use UTC inclusive calendar days for 7-, 30-, and 90-day views. Inventory alerts always reflect current active-variant stock and are not historical period metrics.
- Top variants use immutable order-item snapshots. Webhook ledger records are never joined into sales aggregation, so event retries cannot multiply revenue.
- Vercel production rate limits use the platform-overwritten `x-vercel-forwarded-for`. Generic forwarded-address headers are ignored in production unless a controlled proxy deployment explicitly opts in and overwrites them.
- Browser payment initiation and guest order lookup require an exact canonical Origin. Request bodies are limited by streamed byte count rather than JavaScript string length.
- Login and payment initiation use both identity/source and source-wide HMAC buckets to limit attacks that rotate email values. Expired bucket deletion is a separate dry-run-first maintenance operation.
- Production responses use a conservative baseline CSP and security-header policy. A strict nonce-based script policy is deferred until hosted rendering and Stripe navigation are validated.
- Hosted PostgreSQL connections require TLS. Runtime and migration roles should be separated by least privilege, and production configuration is checked without revealing values.
- Production seeding and production payment reconciliation are prohibited. Remote development seeding, sandbox reconciliation, and production administrator provisioning require explicit, temporary operator gates.
- Dependency remediation must preserve supported framework and ORM versions. Compatible transitive fixes may be pinned; force-driven major downgrades are not accepted merely to reduce an audit counter.

## Unresolved

Production tax automation, abandoned-order retention, refund and partial-refund policy, production pool sizing, staff permission mapping, password recovery, MFA, credential rotation, transactional-email ownership verification, monitoring/alerting, and a strict nonce-based CSP remain open. These must be resolved before the relevant implementation or launch task.
