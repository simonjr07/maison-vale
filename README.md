# Maison Vale

Maison Vale is a fictional premium lifestyle e-commerce portfolio application. This repository is currently at TASK-001: project foundation and documentation.

The application is intentionally not a storefront yet. The current page is a minimal foundation screen while the product requirements, architecture, security boundaries, and delivery roadmap are established.

## Current foundation

- Next.js App Router with React and TypeScript
- Tailwind CSS and Turbopack
- Project documentation in [`docs/`](./docs)
- No database, authentication, payments, catalogue, cart, or order functionality yet

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the project.

Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
git diff --check
```

## Roadmap

The planned implementation sequence is documented in [`docs/TASKS.md`](./docs/TASKS.md). Decisions and unresolved questions are recorded in [`docs/DECISIONS.md`](./docs/DECISIONS.md).

## Engineering notes

This project does not claim unfinished functionality. Future commerce work must preserve server-side authority over totals, inventory, authentication, authorization, and payment events. See [`AGENTS.md`](./AGENTS.md) for the working rules.
