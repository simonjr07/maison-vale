# Hosted QA evidence register

This register distinguishes repository readiness from external evidence. Leave an item pending until it has been observed on the public HTTPS deployment. Record no secret values, full customer details, database hosts, Stripe object ids, or reusable administrator credentials.

## Local release evidence — 2026-10-08

| Check | Result |
|---|---|
| ESLint and TypeScript | Passed |
| Unit tests | 24 files and 121 tests passed |
| PostgreSQL integrations | All 10 suites passed sequentially |
| Prisma schema and local migration status | Valid; 5 migrations applied locally |
| Production build | Passed; 30 routes generated or classified successfully |
| Reviewed image assets | 24 catalogue photographs and 1 editorial image passed |
| Redacted runtime and migration configuration checks | Passed with synthetic production-shaped values |
| Local robots and sitemap | HTTP 200; 8 products and 4 collections; private prefixes excluded |
| Dependency audit | 8 high, 0 critical overall; 3 Prisma CLI/optional-peer nodes with `--omit=dev`; documented, no safe supported fix |
| Tracked secret pattern review | No credential found; the only live-key prefix is an intentional rejection-test sentinel |
| `git diff --check` | Passed |

These are local results only. They do not change any pending hosted status below.

## Environment

| Item | Status | Evidence |
|---|---|---|
| Public Vercel URL | Pending | No deployment URL verified. |
| Supabase project and region | Pending | Account-owned setup required. |
| Pooled runtime role and connection | Pending | Must be verified without recording the connection value. |
| Direct migration role | Pending | Must remain outside the Vercel web runtime. |
| Migration deployment | Pending | Requires explicit approval before remote write. |
| Fictional catalogue bootstrap | Pending | Requires separate approval; no fabricated commerce records permitted. |
| Stripe sandbox endpoint | Pending | Create after the canonical HTTPS URL exists. |
| Hosted administrator | Pending | Provision through the gated one-off command only. |
| Backup and restore evidence | Pending | Provider configuration and a successful restore drill are not yet verified. |

## Automated read-only checks

Run `npm run qa:hosted -- --url=https://HOST` and attach the redacted output.

| Check | Status |
|---|---|
| Homepage and shop return HTTP 200 | Pending |
| Four collection and eight product sitemap routes return HTTP 200 | Pending |
| All 25 image assets pass hosted optimization | Pending |
| CSP, frame, MIME, HSTS, and disclosure headers | Pending |
| Cart, checkout, orders, admin, and API indexing boundaries | Pending |
| Unauthenticated admin redirect | Pending |
| Missing-Origin lookup and payment requests rejected | Pending |

## Manual commerce checks

| Check | Status | Required evidence |
|---|---|---|
| Cart and authoritative checkout totals | Pending | Browser result and matching server summary. |
| Stripe sandbox Checkout success | Pending | Real test Session completed with a Stripe test card. |
| Hosted webhook delivery | Pending | Dashboard delivery shows successful HTTP response. |
| Payment finalization | Pending | Database, success page, admin order, and analytics agree. |
| Exactly-once inventory | Pending | One decrement and one movement after redelivery. |
| Redirect without webhook | Pending | Order remains pending and is not presented as paid. |
| Checkout cancellation | Pending | Cart/order behavior remains truthful. |
| Guest lookup isolation | Pending | Correct proof succeeds; wrong proof and cross-order URL fail generically. |
| ADMIN and STAFF authority | Pending | ADMIN mutation succeeds; STAFF mutation is denied where a test STAFF account exists. |
| Fulfillment history | Pending | Valid sequential transitions produce one event each. |

## Manual browser and operations checks

| Check | Status |
|---|---|
| 320 px, 390 px, tablet, desktop, and 200% zoom | Pending |
| Keyboard navigation, visible focus, errors, and announcements | Pending |
| Reduced motion and product gallery controls | Pending |
| Secure and HttpOnly cookie attributes | Pending |
| Vercel runtime logs contain no unexpected exceptions or sensitive values | Pending |
| Redeployment/restart stability | Pending |
| Rate-limit cleanup schedule and failure alert | Pending |
| Database connection and webhook failure monitoring | Pending |
| Rollback to a known-good deployment | Pending |

## Performance and search evidence

| Check | Status |
|---|---|
| Titles, descriptions, canonical origin, robots, and sitemap | Pending hosted verification |
| Homepage and product image layout stability | Pending browser measurement |
| Practical Core Web Vitals run | Pending; record tool, date, device profile, and result |
| Private routes absent from search-facing metadata | Pending hosted verification |

## Portfolio evidence

The case study is written from repository evidence and clearly marks hosted outcomes pending. The final screenshot set remains pending; follow [`SCREENSHOTS.md`](./SCREENSHOTS.md). Do not add a live URL to the README until this register identifies the verified deployment and date.
