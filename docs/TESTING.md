# Testing strategy

No general application test framework is installed yet. Testing infrastructure will be introduced with the first behavioral domain work.

TASK-002 provides a database smoke script that opens a real adapter-backed connection and performs safe count queries against core seed tables. Schema validation, migration status, idempotent seeding, and this smoke check form the database-foundation verification set. They require a running PostgreSQL instance.

Planned coverage includes unit and validation tests; database integration tests; authentication and authorization tests; cart and price calculations; inventory and concurrency behavior; Stripe signature, webhook, and idempotency tests; order lifecycle tests; and manual hosted QA. Responsive and accessibility spot checks should be recorded for meaningful UI changes.
