# Testing strategy

Vitest is installed for focused server-side behavior tests.

TASK-002 provides a database smoke script that opens a real adapter-backed connection and performs safe count queries against core seed tables. Schema validation, migration status, idempotent seeding, and this smoke check form the database-foundation verification set. They require a running PostgreSQL instance.

TASK-003 tests credential validation and normalization, real bcrypt hashing and verification, active and inactive users, invalid passwords, limiter denial and fail-closed behavior, generic public errors, and ADMIN/STAFF role enforcement. `npm run test:auth:integration` verifies provisioning, valid and invalid credentials, protected access, inactive-user revocation, STAFF shell access, and sign-out against PostgreSQL and a running application. It leaves its fixed verification account inactive and never prints the generated password.

TASK-004 tests product visibility, category filtering, invalid lookups, variant availability, exact and variable price labels, primary-image selection, fallback images, and safe public DTO shaping. `npm run test:catalogue:integration` checks the seeded catalogue against PostgreSQL, including category/product counts, hidden fixtures, variants, image metadata, and unavailable stock examples.

Planned coverage includes unit and validation tests; database integration tests; authentication and authorization tests; cart and price calculations; inventory and concurrency behavior; Stripe signature, webhook, and idempotency tests; order lifecycle tests; and manual hosted QA. Responsive and accessibility spot checks should be recorded for meaningful UI changes.
