import { z } from "zod";

export const MAX_INVENTORY_QUANTITY = 100_000;

export const INVENTORY_MOVEMENT_REASONS = [
  "RESTOCK",
  "MANUAL_ADJUSTMENT",
  "ORDER",
  "ORDER_CANCELLATION",
  "REFUND",
  "CORRECTION",
] as const;

export type InventoryMovementReason =
  (typeof INVENTORY_MOVEMENT_REASONS)[number];

export type VariantAvailabilityInput = {
  productActive: boolean;
  productPublished: boolean;
  variantActive: boolean;
  stockQuantity: number;
};

export type InventoryErrorCode =
  | "INVALID_ADJUSTMENT"
  | "VARIANT_NOT_FOUND"
  | "VARIANT_UNAVAILABLE"
  | "PRODUCT_UNAVAILABLE"
  | "INSUFFICIENT_STOCK"
  | "INVENTORY_LIMIT_EXCEEDED"
  | "CONCURRENT_MODIFICATION"
  | "DATABASE_FAILURE";

const errorMessages: Record<InventoryErrorCode, string> = {
  INVALID_ADJUSTMENT: "The inventory adjustment is invalid.",
  VARIANT_NOT_FOUND: "The product variant was not found.",
  VARIANT_UNAVAILABLE: "The product variant is unavailable.",
  PRODUCT_UNAVAILABLE: "The product is unavailable.",
  INSUFFICIENT_STOCK: "There is not enough stock for this adjustment.",
  INVENTORY_LIMIT_EXCEEDED: "The adjustment exceeds the inventory limit.",
  CONCURRENT_MODIFICATION: "Inventory changed during the adjustment. Try again.",
  DATABASE_FAILURE: "Inventory could not be updated.",
};

export class InventoryError extends Error {
  readonly code: InventoryErrorCode;

  constructor(
    code: InventoryErrorCode,
    message = errorMessages[code],
  ) {
    super(message);
    this.name = "InventoryError";
    this.code = code;
  }
}

const referenceFields = {
  referenceType: z.string().trim().min(1).max(80).optional(),
  referenceId: z.string().trim().min(1).max(120).optional(),
};

const commandFields = {
  variantId: z.string().uuid(),
  reason: z.enum(INVENTORY_MOVEMENT_REASONS),
  ...referenceFields,
};

function requireReferencePair<Schema extends z.ZodType>(schema: Schema) {
  return schema.superRefine((value, context) => {
    if (typeof value !== "object" || value === null) return;

    const reference = value as {
      referenceType?: string;
      referenceId?: string;
    };

    if (Boolean(reference.referenceType) !== Boolean(reference.referenceId)) {
      context.addIssue({
        code: "custom",
        message: "Reference type and reference id must be provided together.",
      });
    }
  });
}

const positiveQuantity = z
  .number()
  .int()
  .min(1)
  .max(MAX_INVENTORY_QUANTITY);

const stockLevel = z
  .number()
  .int()
  .min(0)
  .max(MAX_INVENTORY_QUANTITY);

export const increaseInventorySchema = requireReferencePair(
  z.object({ ...commandFields, quantity: positiveQuantity }).strict(),
);

export const decreaseInventorySchema = requireReferencePair(
  z.object({ ...commandFields, quantity: positiveQuantity }).strict(),
);

export const setInventorySchema = requireReferencePair(
  z.object({ ...commandFields, quantity: stockLevel, expectedQuantity: stockLevel.optional() }).strict(),
);

export const inventoryAdjustmentSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("INCREASE"),
    ...commandFields,
    quantity: positiveQuantity,
  }).strict(),
  z.object({
    operation: z.literal("DECREASE"),
    ...commandFields,
    quantity: positiveQuantity,
  }).strict(),
  z.object({
    operation: z.literal("SET"),
    ...commandFields,
    quantity: stockLevel,
    expectedQuantity: stockLevel.optional(),
  }).strict(),
]).superRefine((value, context) => {
  if (Boolean(value.referenceType) !== Boolean(value.referenceId)) {
    context.addIssue({
      code: "custom",
      message: "Reference type and reference id must be provided together.",
    });
  }
});

export type IncreaseInventoryCommand = z.infer<typeof increaseInventorySchema>;
export type DecreaseInventoryCommand = z.infer<typeof decreaseInventorySchema>;
export type SetInventoryCommand = z.infer<typeof setInventorySchema>;
export type InventoryAdjustmentCommand = z.infer<
  typeof inventoryAdjustmentSchema
>;

export function getVariantAvailability(input: VariantAvailabilityInput) {
  if (
    !input.productActive ||
    !input.productPublished ||
    !input.variantActive
  ) {
    return "Unavailable" as const;
  }

  return input.stockQuantity > 0
    ? ("In stock" as const)
    : ("Out of stock" as const);
}

export function isVariantPurchasable(input: VariantAvailabilityInput) {
  return getVariantAvailability(input) === "In stock";
}

export function parseInventoryAdjustment(input: unknown) {
  const parsed = inventoryAdjustmentSchema.safeParse(input);

  if (!parsed.success) {
    throw new InventoryError("INVALID_ADJUSTMENT");
  }

  return parsed.data;
}
