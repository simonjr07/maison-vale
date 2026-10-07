# Security boundaries

Future implementation must verify Stripe webhook signatures, calculate prices server-side, protect inventory mutations, and rate-limit other sensitive flows. Public order lookup must resist enumeration and reveal minimal data.

Secrets belong in environment configuration and must never reach browser bundles, source control, logs, or error responses. Logs should omit payment credentials and unnecessary personal data. Same-origin and CSRF considerations must be reviewed for state-changing browser requests. Database constraints and transactions must preserve integrity, including non-negative inventory and idempotent payment events.

These are preliminary controls, not a compliance or penetration-testing claim.

The initial migration enforces non-negative inventory and monetary values, positive quantities/refunds, and consistent order arithmetic. These checks are a final database boundary, not a replacement for request validation or transactional application logic. The generated client is excluded from source control, and the runtime client is marked server-only to prevent accidental client-component imports.

## Administrative authentication

TASK-003 implements Auth.js credentials authentication with eight-hour encrypted JWT sessions. Only user id and role are added to the session. Passwords are hashed with bcrypt using 12 rounds; inputs are normalized and validated with Zod; inactive users and invalid credentials receive the same public response. A dummy bcrypt comparison reduces account-existence timing differences.

Every protected page resolves the session and rechecks id, role, and active state from PostgreSQL. ADMIN-only and explicitly shared ADMIN/STAFF access use reusable server-side role helpers. There is no registration route.

Login attempts use a 15-minute fixed window with five allowed attempts. The stored bucket key is an HMAC-SHA256 digest of normalized email and request source using `RATE_LIMIT_SECRET`; raw identifiers are not stored. Missing secrets and database failures deny authentication. Auth logs omit credentials and expected invalid-credential details.

Auth.js trusts the host supplied by the deployment platform. Production must retain the documented Vercel topology or otherwise validate and normalize forwarded host and client-address headers at the trusted proxy boundary.
