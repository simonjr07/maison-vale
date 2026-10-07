-- CreateTable
CREATE TABLE "LoginRateLimitBucket" (
    "id" UUID NOT NULL,
    "keyHash" CHAR(64) NOT NULL,
    "windowStart" TIMESTAMPTZ(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "LoginRateLimitBucket_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LoginRateLimitBucket_attempts_nonnegative" CHECK ("attempts" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "LoginRateLimitBucket_keyHash_windowStart_key" ON "LoginRateLimitBucket"("keyHash", "windowStart");
CREATE INDEX "LoginRateLimitBucket_expiresAt_idx" ON "LoginRateLimitBucket"("expiresAt");
