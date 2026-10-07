# Deployment

## Intended topology

Local development: Next.js with Docker PostgreSQL. Production: Vercel application, Supabase PostgreSQL, and Stripe.

Likely configuration responsibilities:

- `DATABASE_URL`: pooled application database connection.
- `DIRECT_URL`: direct connection for migrations where required.
- `AUTH_SECRET`: server-only session/authentication secret.
- `RATE_LIMIT_SECRET`: server-only signing or rate-limit secret if needed.
- Stripe secret key: server-only Stripe API credential.
- Stripe webhook secret: server-only signature verification secret.
- Public Stripe publishable key: browser-safe key only if the chosen checkout flow needs it.

No real values belong in this repository. Future migrations must be reviewed, reproducible, and safe for production data. Hosted QA should verify payments, webhooks, order state, inventory behavior, responsive layout, and accessibility before release.
