# Maison Vale

Maison Vale is a fictional premium lifestyle e-commerce portfolio application. The repository includes the project foundation, PostgreSQL/Prisma data layer, administrative authentication, and a public product catalogue.

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
- Honest variant pricing, advisory availability, ordered product images, and safe public DTOs
- No public registration, cart, checkout, payment, or operational admin modules yet

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

This project does not claim unfinished functionality. Future commerce work must preserve server-side authority over totals, inventory, authentication, authorization, and payment events. See [`AGENTS.md`](./AGENTS.md) for the working rules.
