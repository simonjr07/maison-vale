# TASK-014 security audit

## Scope and conclusion

This review covered administrative authentication and authorization, public request boundaries, guest privacy, Stripe Checkout and webhook processing, database and inventory integrity, HTTP policy, dependencies, CI, operational scripts, and deployment configuration. It is a code and configuration review, not a penetration test or compliance certification.

No critical path was found that lets a browser redirect, public order reference, administrative UI visibility, or unverified Stripe payload create a paid state. Verified test-mode webhooks remain the payment authority. Inventory decrements, movement records, payment state, and fulfillment transitions retain their existing transactional and idempotent controls.

## Findings

| Severity | Finding | Resolution or disposition |
|---|---|---|
| High | No confirmed high-impact application vulnerability was found. | Payment truth, role checks, scoped guest access, and atomic stock handling were retained and expanded with regression coverage. |
| Medium | Generic `x-forwarded-for` was accepted as a rate-limit identity in production, allowing spoofing outside a proxy that overwrites it. | Vercel now uses only its overwritten platform header. Other production deployments ignore forwarding headers unless explicitly configured behind a trusted proxy. Values are parsed as IP addresses. |
| Medium | Payment-session creation and guest lookup accepted requests with no `Origin`, weakening browser CSRF defenses. | Both state-changing browser routes now require a present, exact canonical Origin. Production requires an HTTPS `APP_URL`. |
| Medium | Request-size checks occurred after reading full strings and counted characters rather than bytes. | JSON and webhook handlers use a streamed, byte-counted bounded reader and return `413` when exceeded. Stripe signatures still use the untouched raw text. |
| Medium | Login and checkout limits were scoped only to an identity/source pair, allowing one source to rotate email values. | Each flow now also consumes a broader source-only HMAC bucket. Database errors and missing limiter secrets continue to fail closed. |
| Medium | Production database encryption was documented but not enforced at startup. | Non-local production PostgreSQL URLs now require an explicit secure `sslmode`; deployment checks validate runtime and migration URLs. |
| Medium | Seeding, sandbox reconciliation, and production admin provisioning lacked sufficiently explicit operator gates. | Production seed and reconciliation are prohibited. Remote seed, sandbox reconciliation, and production provisioning require separate temporary opt-ins. |
| Low | Baseline security, cache, and indexing headers were incomplete. | Added framing, MIME, referrer, permissions, HSTS, narrow CSP, no-store, and noindex policies; disabled framework disclosure and production browser source maps. |
| Low | Expired rate-limit records had no operational cleanup command. | Added a dry-run-first cleanup command suitable for an authorized scheduled job. |
| Low | The repository had no automated PostgreSQL-backed CI gate. | Added least-privilege CI permissions, lockfile install, Prisma migration, isolated seed, static checks, integration tests, and build. |

## Dependency review

The initial `npm audit` result reported nine high-severity vulnerable dependency nodes. The affected paths are lint, build, and Prisma CLI tooling, not packages imported by the request-handling application code. A compatible override updates Prisma's transitive `mysql2` package to `3.24.5`, reducing the result to eight high-severity nodes even though Maison Vale uses PostgreSQL.

The remaining paths are `eslint-config-next` through `fast-glob`, `micromatch`, and `braces`, plus Prisma CLI configuration through `deepmerge-ts`. `npm audit --omit=dev` still reports three Prisma-related nodes because `@prisma/client` declares the Prisma CLI as an optional peer and npm resolves the installed development CLI; the vulnerable configuration merger is not imported by the runtime database client. The registry offered no compatible patched `braces` release in the declared chain, while npm's proposed Prisma remediation would be an incompatible major downgrade. `npm audit fix --force` was therefore not used. These findings still require monitoring and should be retested when supported upstream releases become available.

## Verified controls

- Auth.js sessions contain minimal identity data, last eight hours, and are followed by active-user and role rechecks in PostgreSQL.
- Passwords use bcrypt with 12 rounds; invalid, inactive, and unknown users receive generic responses with a dummy comparison path.
- Administrative mutations independently require ADMIN authority. STAFF access remains explicitly read-only.
- Checkout pricing, totals, stock, order snapshots, and Stripe line items come from current server data.
- The webhook verifies its raw-body signature, rejects live events, validates session linkage, amount and currency, and uses event-level plus payment-level idempotency.
- Inventory cannot become negative; order finalization and movement history commit atomically. A paid stock conflict preserves payment truth and requires review without advancing fulfillment.
- Guest lookup uses reference plus email, generic denial, HMAC-keyed limits, and a 15-minute signed HttpOnly session scoped to one order. Public DTOs mask or omit contact, address, provider, internal, and diagnostic fields.
- Production configuration validation reports only setting names and safe guidance, never secret values.

## Residual risk and launch blockers

The following items are intentionally not represented as solved:

- Email plus order reference is lightweight verification, not strong ownership authentication. Transactional email with short-lived codes or links remains preferred.
- Password recovery, MFA, administrator credential rotation, and finer-grained staff permissions are not implemented.
- Tax automation, refunds and partial-refund policy, cancellation/restock behavior, and abandoned pending-order retention remain unresolved business controls.
- Carrier tracking and delivery confirmation are manual operational states, not provider evidence.
- Monitoring, alert routing, log retention/redaction review, database backup restore evidence, and incident-response ownership require hosted operations.
- The CSP deliberately omits a strict nonce-based script policy until Next.js hydration, errors, and Stripe navigation can be validated on the hosted origin.
- Read-only hosted QA has verified public Vercel routes, image optimization, security/indexing headers, the unauthenticated admin boundary, and missing-Origin rejection. One signed sandbox payment lifecycle was confirmed through redacted persisted outcomes. The owner reports completing the agreed browser checklist on 9 October 2026, including mobile responsiveness, basic keyboard/focus, zoom, and motion-preference checks; this is not a formal accessibility result. Hosted STAFF/inactive-user authorization, production cookie inspection, provider logs and alerting, Neon role/backup evidence, formal accessibility verification, advanced lookup and webhook edge cases, and rollback still require TASK-015 evidence.
- Stripe remains test mode only. Live payments must not be enabled without a separate design, operational, legal, and security review.

## Operator references

Use [`DEPLOYMENT.md`](./DEPLOYMENT.md) for environment and database guidance, [`TESTING.md`](./TESTING.md) for the verification matrix, and [`TASK_015_CHECKLIST.md`](./TASK_015_CHECKLIST.md) for hosted release evidence.
