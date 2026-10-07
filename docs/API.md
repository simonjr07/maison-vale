# API and server-boundary conventions

No public API endpoints are implemented yet. Future handlers and server actions must validate all inputs with a shared schema strategy, authenticate protected requests, authorize each admin operation server-side, and return safe errors without leaking internals.

The server calculates authoritative prices, discounts, shipping, tax, and totals. Client-supplied totals and availability are advisory only. Payment endpoints should use idempotency keys where a retry could create a duplicate effect. Stripe webhooks must verify the raw-body signature before parsing or processing events, then record event identity and process idempotently.

Expected safeguards include rate limiting for authentication, checkout, webhooks, and public order lookup; DTOs with explicit response allow-lists; conservative logging; and no secrets in browser bundles or responses.
