# Testing strategy

Vitest is installed for focused server-side behavior tests.

TASK-002 provides a database smoke script that opens a real adapter-backed connection and performs safe count queries against core seed tables. Schema validation, migration status, idempotent seeding, and this smoke check form the database-foundation verification set. They require a running PostgreSQL instance.

TASK-003 tests credential validation and normalization, real bcrypt hashing and verification, active and inactive users, invalid passwords, limiter denial and fail-closed behavior, generic public errors, and ADMIN/STAFF role enforcement. `npm run test:auth:integration` verifies provisioning, valid and invalid credentials, protected access, inactive-user revocation, STAFF shell access, and sign-out against PostgreSQL and a running application. It leaves its fixed verification account inactive and never prints the generated password.

TASK-004 tests product visibility, category filtering, invalid lookups, variant availability, exact and variable price labels, primary-image selection, fallback images, and safe public DTO shaping. `npm run test:catalogue:integration` checks the seeded catalogue against PostgreSQL, including category/product counts, hidden fixtures, variants, image metadata, and unavailable stock examples.

TASK-005 tests centralized purchasability and command validation, including inactive variants, inactive or unpublished products, zero stock, fractional and out-of-range quantities, malformed identifiers, and incomplete references. `npm run test:inventory:integration` uses temporary PostgreSQL fixtures to verify increases, decreases, exact-stock consumption, insufficient-stock failure, audit accuracy, rollback behavior, the database non-negative constraint, and a real concurrent one-unit race. The script removes only its uniquely named verification records.

TASK-006 tests persisted cart validation and recovery, unsupported versions, invalid quantities, duplicate merging, line and total limits, cart mutation limits, total-unit counts, and in-session price-change detection. `npm run test:cart:integration` uses temporary PostgreSQL fixtures to verify authoritative multi-line totals, ignored client prices, hidden and inactive products, inactive and zero-stock variants, stale quantity adjustment, refreshed prices, and safe DTO shaping.

Planned coverage includes checkout calculations; Stripe signature, webhook, and idempotency tests; order lifecycle tests; and manual hosted QA. Responsive and accessibility spot checks should be recorded for meaningful UI changes.
