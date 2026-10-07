import type { PrismaClient } from "../../generated/prisma/client";

import {
  type DecreaseInventoryCommand,
  type IncreaseInventoryCommand,
  InventoryError,
  MAX_INVENTORY_QUANTITY,
  type SetInventoryCommand,
  decreaseInventorySchema,
  increaseInventorySchema,
  parseInventoryAdjustment,
  setInventorySchema,
} from "./inventory-domain.ts";

type InventoryDatabase = PrismaClient;

export type InventoryMutationResult = {
  variantId: string;
  stockQuantity: number;
  movement: {
    id: string;
    quantityDelta: number;
    reason: string;
    referenceType: string | null;
    referenceId: string | null;
    createdAt: Date;
  };
};

function parseCommand<T>(
  schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false } },
  input: unknown,
) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new InventoryError("INVALID_ADJUSTMENT");
  return parsed.data;
}

function movementData(
  command:
    | IncreaseInventoryCommand
    | DecreaseInventoryCommand
    | SetInventoryCommand,
  quantityDelta: number,
) {
  return {
    productVariantId: command.variantId,
    quantityDelta,
    reason: command.reason,
    referenceType: command.referenceType ?? null,
    referenceId: command.referenceId ?? null,
  };
}

function normalizeInventoryError(error: unknown): never {
  if (error instanceof InventoryError) throw error;
  throw new InventoryError("DATABASE_FAILURE");
}

export function createInventoryService(database: InventoryDatabase) {
  async function increaseInventory(input: unknown): Promise<InventoryMutationResult> {
    const command = parseCommand(increaseInventorySchema, input);

    try {
      return await database.$transaction(async (transaction) => {
        const updated = await transaction.productVariant.updateMany({
          where: {
            id: command.variantId,
            stockQuantity: {
              lte: MAX_INVENTORY_QUANTITY - command.quantity,
            },
          },
          data: { stockQuantity: { increment: command.quantity } },
        });

        if (updated.count !== 1) {
          const variant = await transaction.productVariant.findUnique({
            where: { id: command.variantId },
            select: { stockQuantity: true },
          });

          if (!variant) throw new InventoryError("VARIANT_NOT_FOUND");
          throw new InventoryError("INVENTORY_LIMIT_EXCEEDED");
        }

        const [variant, movement] = await Promise.all([
          transaction.productVariant.findUniqueOrThrow({
            where: { id: command.variantId },
            select: { id: true, stockQuantity: true },
          }),
          transaction.inventoryMovement.create({
            data: movementData(command, command.quantity),
            select: {
              id: true,
              quantityDelta: true,
              reason: true,
              referenceType: true,
              referenceId: true,
              createdAt: true,
            },
          }),
        ]);

        return { variantId: variant.id, stockQuantity: variant.stockQuantity, movement };
      });
    } catch (error) {
      normalizeInventoryError(error);
    }
  }

  async function decreaseInventory(input: unknown): Promise<InventoryMutationResult> {
    const command = parseCommand(decreaseInventorySchema, input);

    try {
      return await database.$transaction(async (transaction) => {
        const updated = await transaction.productVariant.updateMany({
          where: {
            id: command.variantId,
            active: true,
            stockQuantity: { gte: command.quantity },
            product: { active: true, published: true },
          },
          data: { stockQuantity: { decrement: command.quantity } },
        });

        if (updated.count !== 1) {
          const variant = await transaction.productVariant.findUnique({
            where: { id: command.variantId },
            select: {
              active: true,
              stockQuantity: true,
              product: { select: { active: true, published: true } },
            },
          });

          if (!variant) throw new InventoryError("VARIANT_NOT_FOUND");
          if (!variant.active) throw new InventoryError("VARIANT_UNAVAILABLE");
          if (!variant.product.active || !variant.product.published) {
            throw new InventoryError("PRODUCT_UNAVAILABLE");
          }
          throw new InventoryError("INSUFFICIENT_STOCK");
        }

        const [variant, movement] = await Promise.all([
          transaction.productVariant.findUniqueOrThrow({
            where: { id: command.variantId },
            select: { id: true, stockQuantity: true },
          }),
          transaction.inventoryMovement.create({
            data: movementData(command, -command.quantity),
            select: {
              id: true,
              quantityDelta: true,
              reason: true,
              referenceType: true,
              referenceId: true,
              createdAt: true,
            },
          }),
        ]);

        return { variantId: variant.id, stockQuantity: variant.stockQuantity, movement };
      });
    } catch (error) {
      normalizeInventoryError(error);
    }
  }

  async function setInventory(input: unknown): Promise<InventoryMutationResult> {
    const command = parseCommand(setInventorySchema, input);

    try {
      return await database.$transaction(async (transaction) => {
        const current = await transaction.productVariant.findUnique({
          where: { id: command.variantId },
          select: { stockQuantity: true },
        });

        if (!current) throw new InventoryError("VARIANT_NOT_FOUND");

        const quantityDelta = command.quantity - current.stockQuantity;
        if (quantityDelta === 0) {
          throw new InventoryError(
            "INVALID_ADJUSTMENT",
            "Inventory is already set to the requested quantity.",
          );
        }

        const updated = await transaction.productVariant.updateMany({
          where: {
            id: command.variantId,
            stockQuantity: current.stockQuantity,
          },
          data: { stockQuantity: command.quantity },
        });

        if (updated.count !== 1) {
          throw new InventoryError("CONCURRENT_MODIFICATION");
        }

        const movement = await transaction.inventoryMovement.create({
          data: movementData(command, quantityDelta),
          select: {
            id: true,
            quantityDelta: true,
            reason: true,
            referenceType: true,
            referenceId: true,
            createdAt: true,
          },
        });

        return {
          variantId: command.variantId,
          stockQuantity: command.quantity,
          movement,
        };
      });
    } catch (error) {
      normalizeInventoryError(error);
    }
  }

  async function adjustInventory(input: unknown) {
    const command = parseInventoryAdjustment(input);
    const { operation, ...adjustment } = command;

    if (operation === "INCREASE") return increaseInventory(adjustment);
    if (operation === "DECREASE") return decreaseInventory(adjustment);
    return setInventory(adjustment);
  }

  async function getInventoryForVariant(variantId: string) {
    return database.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        stockQuantity: true,
        active: true,
        product: { select: { active: true, published: true } },
      },
    });
  }

  return {
    adjustInventory,
    decreaseInventory,
    getInventoryForVariant,
    increaseInventory,
    setInventory,
  };
}
