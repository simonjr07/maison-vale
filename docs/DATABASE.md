# Database foundation

No Prisma schema is created in TASK-001. The following is a preliminary domain model, not a final schema.

Likely concepts are User, Category, Product, ProductVariant, ProductImage, Inventory, Cart or cart state, Order, OrderItem, Payment, OrderStatusEvent, StripeWebhookEvent (or equivalent idempotency record), and StoreSettings.

Products may have many variants and images; categories may relate to many products; orders contain immutable item snapshots; payments belong to orders; status events provide an audit trail; webhook records prevent duplicate processing. Inventory should be associated with the sellable variant and protected by transactional server-side updates.

Unresolved questions: inventory reservation versus decrement-at-purchase, guest cart persistence, shipping and address modeling, tax and currency representation, refund and partial-refund representation, product archival, and whether settings require versioning. These decisions should be made before schema implementation.
