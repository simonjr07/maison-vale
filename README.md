# Maison Vale

Maison Vale is a fictional premium lifestyle e-commerce portfolio application. The project foundation is complete and TASK-002 has established the PostgreSQL and Prisma data layer; live database validation remains pending on a Docker-enabled machine.

The application is intentionally not a storefront yet. The current page is a minimal foundation screen while the product requirements, architecture, security boundaries, and delivery roadmap are established.

## Current foundation

- Next.js App Router with React and TypeScript
- Tailwind CSS and Turbopack
- PostgreSQL 17 through Docker Compose on local port 5435
- Prisma ORM 7 with the PostgreSQL driver adapter and tracked migrations
- Initial catalogue, inventory, order, payment, refund, and webhook-ledger models
- Project documentation in [`docs/`](./docs)
- No authentication, storefront, payment, cart, checkout, or admin behavior yet

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
npm run build
npm run db:status
git diff --check
```

## Roadmap

The planned implementation sequence is documented in [`docs/TASKS.md`](./docs/TASKS.md). Decisions and unresolved questions are recorded in [`docs/DECISIONS.md`](./docs/DECISIONS.md).

## Engineering notes

This project does not claim unfinished functionality. Future commerce work must preserve server-side authority over totals, inventory, authentication, authorization, and payment events. See [`AGENTS.md`](./AGENTS.md) for the working rules.
