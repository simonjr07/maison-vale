# Hosted QA evidence register

This register separates verified hosted evidence, owner-reported sandbox evidence, local automated coverage, and checks that still require account or browser access. It records no credentials, database hosts, reusable administrator details, customer information, Stripe identifiers, or full order references.

## Release boundary

- Public sandbox: [https://maison-vale-six.vercel.app](https://maison-vale-six.vercel.app)
- Hosted QA date: 9 October 2026
- Owner-reported browser QA completion date: 9 October 2026
- Intended use: portfolio demonstration with fictional data and Stripe test mode
- Live-commerce readiness: not claimed

## Verified hosted read-only checks

`npm run qa:hosted -- --url=https://maison-vale-six.vercel.app` completed every assertion and reported the following results:

| Check | Status | Evidence boundary |
|---|---|---|
| Homepage, shop, cart, checkout, and order lookup availability | Verified | Expected public routes returned HTTP 200. |
| Catalogue coverage | Verified | Sitemap contained four collections and eight product routes, and every URL returned successfully. |
| Hosted images | Verified | All 24 product photographs and the editorial image passed the Next.js optimizer. |
| Security headers | Verified | CSP framing restriction, `X-Frame-Options`, MIME-sniffing protection, HSTS, and framework-disclosure removal passed. |
| Private/indexing boundaries | Verified | Cart, checkout, orders, admin, API, robots, and sitemap assertions passed. |
| Unauthenticated admin boundary | Verified | `/admin` resolved only to the same-origin login boundary; the verifier recognizes both HTTP and Next.js streamed redirects and rejects protected admin content. |
| Missing-Origin mutation requests | Verified | Public order lookup and Checkout Session creation returned HTTP 403 without an Origin header. |

The hosted script does not log in, submit customer details, start Checkout, mutate data, run migrations, seed, reconcile payments, or inspect provider consoles.

## Final local verification — 9 October 2026

| Check | Result |
|---|---|
| ESLint | Passed with no diagnostics |
| TypeScript | Passed with `tsc --noEmit` |
| Unit tests | 26 files and 141 tests passed |
| Local PostgreSQL integrations | All 11 scripts passed sequentially against the confirmed local target |
| Production build | Passed; all 30 routes generated or classified successfully |
| Git whitespace validation | Passed |

## Verified sandbox commerce outcome

The owner completed one real Stripe sandbox Checkout and reviewed the corresponding persisted Neon records. The safe outcome summary was:

| Record | Verified result |
|---|---|
| Payment | `PAID` |
| Order | `PROCESSING` |
| Webhook | `PAYMENT_FINALIZED` |
| Inventory | One movement of `-2` |
| Payment exception | None |

This confirms one successful fictional sandbox lifecycle. It does not prove load capacity, every failure path, duplicate hosted delivery, delayed delivery, or live-payment suitability. Automated local integration coverage separately exercises idempotency, concurrent delivery, amount and currency mismatch, linkage mismatch, inventory-review handling, and rollback.

## Verified from implementation and automated tests

| Area | Evidence |
|---|---|
| Admin authentication | Auth.js credentials flow, generic login errors, source-aware rate limiting, active-user database recheck, and eight-hour JWT session configuration |
| Role authorization | Protected reads require an active ADMIN or STAFF user; catalogue, inventory, and fulfillment mutations require ADMIN inside the Server Action |
| Order lookup privacy | Zod normalization, HMAC proof comparison, generic denial, source and proof-pair limits, signed one-order scope, 15-minute expiry, and masked allow-listed DTO |
| Payment safety | Raw-body signature verification, sandbox enforcement, order/session/amount/currency checks, event and payment idempotency, and transactionally coupled inventory/order updates |
| Response policy | Private/no-store and noindex policies for sensitive surfaces plus global framing, MIME, referrer, permissions, base, object, and form-action restrictions |
| Logging | Application error logs avoid request bodies, credentials, customer fields, order references, and provider identifiers; routine webhook logs retain only event type and safe outcome category |

## Owner-reported browser verification

The project owner reports completing the agreed browser checklist on 9 October 2026. The reported scope covered desktop storefront and product navigation, mobile responsiveness, basic keyboard navigation and visible focus, browser zoom and motion-preference checks, the authenticated administrator workflow, and guest order lookup behavior.

This is owner-reported browser verification. It is distinct from the automated test suite, read-only hosted QA, and the independently reviewed database/payment outcomes above. No detailed viewport measurements, screenshots, formal accessibility audit, screen-reader result, or additional test artifact was supplied, so none is claimed here.

## Manual and operational QA still required

These items remain pending and must not be described as passed:

- Hosted STAFF read-only behavior and inactive-user revocation
- Production session-cookie and lookup-cookie inspection for Secure, HttpOnly, SameSite, path, expiry, and absence from URLs/client payloads
- Advanced guest-order isolation, expiry, direct-refresh, generic-denial, and cross-order URL testing on the hosted origin
- Cross-origin request rejection and rate-limit behavior using controlled test sources
- Redirect-without-webhook, Checkout cancellation, duplicate webhook redelivery, and paid inventory-conflict presentation on the hosted environment
- Formal accessibility verification, including screen-reader behavior, comprehensive focus order, announcements, and documented conformance evidence
- Vercel runtime log review, elevated-5xx alerting, webhook retry alerts, database pool monitoring, authentication-abuse monitoring, and paid inventory-exception alerting
- Neon backup policy, restore exercise, runtime role grants, and connection-pool observations under representative concurrency
- Known-good deployment rollback and post-rollback commerce/privacy smoke checks
- Final sanitized portfolio screenshot capture and privacy review

Independent browser automation was unavailable during the handoff review. Source inspection found semantic landmarks, labels, live regions, visible focus styles, reduced-motion CSS, responsive breakpoints, and accessible gallery/cart controls, while the owner supplied the browser-verification report above. Formal assistive-technology verification is still required. The current storefront has no global skip-to-content link; include bypass-block behavior in any future formal keyboard audit rather than claiming conformance.

## Checks requiring additional access

The following cannot be demonstrated from a public unauthenticated request or repository review alone:

- Vercel environment-variable scope, secret values, runtime logs, alert rules, and deployment rollback controls
- Neon backup/restore configuration, role grants, pool metrics, and provider-side recovery evidence
- Stripe Dashboard endpoint configuration, delivery history, retries, and signature status
- Hosted STAFF read-only behavior, inactive-user revocation, and actual production session-cookie attributes
- Advanced private order lookup isolation and expiry behavior using deliberately supplied fictional proof pairs

Use provider dashboards or supervised fictional accounts for those checks. Do not share credentials, raw logs, customer data, provider identifiers, or reusable access tokens as evidence.

## Release assessment

No code-level blocker is currently identified for a portfolio sandbox release, subject to the local verification suite remaining green. The remaining work is evidence and operations: hosted STAFF/inactive-user verification, cookie inspection, advanced lookup and webhook edge cases, formal accessibility verification, observability, backups, rollback, and screenshots.

Maison Vale is not ready for live commerce. Live readiness would additionally require an approved live-payment strategy, automated tax and refund handling, stronger customer and administrator authentication, operational support ownership, monitored backups and recovery, carrier/fulfillment integration, legal and privacy review, and an appropriate security assessment.
