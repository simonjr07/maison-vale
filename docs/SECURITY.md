# Security boundaries

Future implementation must verify Stripe webhook signatures, calculate prices server-side, protect inventory mutations, enforce admin authentication and authorization on the server, validate all inputs, and rate-limit sensitive flows. Public order lookup must resist enumeration and reveal minimal data.

Secrets belong in environment configuration and must never reach browser bundles, source control, logs, or error responses. Logs should omit payment credentials and unnecessary personal data. Same-origin and CSRF considerations must be reviewed for state-changing browser requests. Database constraints and transactions must preserve integrity, including non-negative inventory and idempotent payment events.

These are preliminary controls, not a compliance or penetration-testing claim.

The initial migration enforces non-negative inventory and monetary values, positive quantities/refunds, and consistent order arithmetic. These checks are a final database boundary, not a replacement for request validation or transactional application logic. The generated client is excluded from source control, and the runtime client is marked server-only to prevent accidental client-component imports.
