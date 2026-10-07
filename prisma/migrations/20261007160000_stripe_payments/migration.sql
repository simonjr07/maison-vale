-- TASK-008 checkout-attempt idempotency and Stripe payment linkage.
ALTER TABLE "Order"
ADD COLUMN "checkoutAttemptHash" CHAR(64),
ADD COLUMN "checkoutFingerprint" CHAR(64),
ADD COLUMN "paymentIssueCode" VARCHAR(80),
ADD COLUMN "paymentIssueMessage" TEXT,
ADD COLUMN "paymentIssueAt" TIMESTAMPTZ(3);

ALTER TABLE "Payment"
ADD COLUMN "providerCheckoutSessionId" VARCHAR(255),
ADD COLUMN "providerAmountCents" INTEGER,
ADD COLUMN "providerCurrency" VARCHAR(3),
ADD COLUMN "failureCode" VARCHAR(80),
ADD COLUMN "failureMessage" TEXT,
ADD CONSTRAINT "Payment_providerAmountCents_nonnegative"
CHECK ("providerAmountCents" IS NULL OR "providerAmountCents" >= 0);

ALTER TABLE "StripeWebhookEvent"
ADD COLUMN "outcomeCode" VARCHAR(80);

CREATE UNIQUE INDEX "Order_checkoutAttemptHash_key"
ON "Order"("checkoutAttemptHash");

CREATE UNIQUE INDEX "Payment_providerCheckoutSessionId_key"
ON "Payment"("providerCheckoutSessionId");
