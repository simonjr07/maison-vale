ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_quantityDelta_nonzero"
    CHECK ("quantityDelta" <> 0),
  ADD CONSTRAINT "InventoryMovement_reference_pair_consistent"
    CHECK (
      ("referenceType" IS NULL AND "referenceId" IS NULL)
      OR ("referenceType" IS NOT NULL AND "referenceId" IS NOT NULL)
    );
