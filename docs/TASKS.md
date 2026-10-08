# Delivery roadmap

| Task | Objective | Deliverables | Acceptance criteria | Status |
|---|---|---|---|---|
| TASK-001 | Foundation and documentation | Baseline app, docs, engineering rules | Clean baseline and validation checks pass | Complete |
| TASK-002 | Database foundation | Prisma, PostgreSQL, initial schema and migrations | Domain model reviewed and local database works | Complete |
| TASK-003 | Admin authentication and authorization | Protected admin access and roles | Unauthorized access is rejected server-side | Complete |
| TASK-004 | Product catalogue | Categories, products, images, public browsing | Catalogue data is validated and readable | Complete |
| TASK-005 | Product variants and inventory | Variant selection and inventory rules | Inventory cannot become negative | Complete |
| TASK-006 | Cart | Guest cart and price calculation | Cart totals are server-authoritative | Complete |
| TASK-007 | Checkout foundation | Guest validation and authoritative checkout preparation | Invalid or stale carts fail safely | Complete |
| TASK-008 | Stripe integration and webhooks | Test-mode payment flow and idempotent events | Verified webhook events drive payment state | Complete |
| TASK-009 | Orders and public order lookup | Confirmation and privacy-safe lookup | Orders expose minimal information | Complete |
| TASK-010 | Admin product and inventory management | Admin catalogue and inventory tools | Authorized changes are audited | Complete |
| TASK-011 | Admin order workflow | Fulfillment workflow | Order transitions are controlled | Planned |
| TASK-012 | Commerce analytics | Basic admin reporting | Metrics are defined and reproducible | Planned |
| TASK-013 | Front-end polish, responsive design, and accessibility | Production UI refinement | Responsive and accessibility review passes | Planned |
| TASK-014 | Security and production hardening | Threat review and safeguards | Security checklist is addressed | Planned |
| TASK-015 | Deployment, hosted QA, screenshots, and case study | Vercel/Supabase deployment evidence | Hosted QA and portfolio evidence are complete | Planned |
