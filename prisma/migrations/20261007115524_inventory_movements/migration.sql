-- CreateEnum
CREATE TYPE "InventoryMovementReason" AS ENUM ('RESTOCK', 'MANUAL_ADJUSTMENT', 'ORDER', 'ORDER_CANCELLATION', 'REFUND', 'CORRECTION');

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" UUID NOT NULL,
    "productVariantId" UUID NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "reason" "InventoryMovementReason" NOT NULL,
    "referenceType" VARCHAR(80),
    "referenceId" VARCHAR(120),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryMovement_productVariantId_createdAt_idx" ON "InventoryMovement"("productVariantId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_referenceType_referenceId_idx" ON "InventoryMovement"("referenceType", "referenceId");

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
