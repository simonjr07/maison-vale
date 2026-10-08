# Maison Vale

Maison Vale is a fictional premium lifestyle e-commerce portfolio application. The repository includes the project foundation, PostgreSQL/Prisma data layer, administrative authentication, public catalogue, guest cart, and Stripe test-mode checkout.

## Current foundation

- Next.js App Router with React and TypeScript
- Tailwind CSS and Turbopack
- PostgreSQL 17 through Docker Compose on local port 5435
- Prisma ORM 7 with the PostgreSQL driver adapter and tracked migrations
- Initial catalogue, inventory, order, payment, refund, and webhook-ledger models
- Project documentation in [`docs/`](./docs)
- Auth.js credentials authentication for active ADMIN and STAFF users
- Protected `/admin` shell with server-side database rechecks and role helpers
- Database-backed, HMAC-keyed login attempt limiting
- Public storefront at `/`, `/shop`, `/shop/[slug]`, and `/collections/[slug]`
- Server-rendered catalogue queries with active and published visibility rules
- Variant-aware low-stock and sold-out messaging with accessible add-to-bag confirmation
- Honest variant pricing, advisory availability, ordered product images, and safe public DTOs
- Variant-level inventory authority with validated, concurrency-safe stock mutations
- Transactional inventory movement history for restocks, corrections, and future order activity
- Versioned browser-persisted guest cart with authoritative server-side price and availability resolution
- U.S.-only guest checkout validation with authoritative shipping, tax, and final totals
- Stripe-hosted test-mode Checkout with order-before-payment snapshots
- Raw-body signed webhooks with durable idempotency and transactional inventory finalization
- Privacy-aware guest order lookup with masked details and short-lived scoped access
- Searchable administrative product, variant, category, image, and inventory tools
- ADMIN-only catalogue mutations, STAFF read access, archival workflows, and audited stock changes
- Secure administrative order search, full fulfillment details, and audited manual dispatch/delivery
- No public registration, automated refunds, carrier tracking, or analytics yet

## Local development

```bash
npm install
npm run db:generate
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run db:smoke
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the project.

Useful checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:catalogue:integration
npm run test:inventory:integration
npm run test:cart:integration
npm run test:checkout:integration
npm run test:payment:integration
npm run test:orders:integration
npm run test:admin-catalogue:integration
npm run test:admin-orders:integration
npm run build
npm run db:status
git diff --check
```

## Local administrator provisioning

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the local ignored `.env` file, then run:

```bash
npm run admin:provision
```

The password must contain 12 to 128 characters. Provisioning creates a new ADMIN account or deliberately updates and activates the existing account with the normalized email. The script never prints the password.

## Roadmap

The planned implementation sequence is documented in [`docs/TASKS.md`](./docs/TASKS.md). Decisions and unresolved questions are recorded in [`docs/DECISIONS.md`](./docs/DECISIONS.md).

## Engineering notes

Checkout creates a pending order and payment before redirecting to Stripe-hosted Checkout. Only a verified webhook can record payment truth and advance the order. Inventory is not reserved; it is committed transactionally after payment, with a review state if stock has changed. The integration accepts test keys and rejects live-mode sessions and webhooks. See [`AGENTS.md`](./AGENTS.md) for the working rules.

Guest order lookup requires the order reference and exact checkout email. Successful verification creates a 15-minute HttpOnly session scoped to one order; public details are allow-listed and the destination is masked. This is lightweight guest verification, not strong identity authentication.
