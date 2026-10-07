import "server-only";

import { db } from "@/server/db/client";

import { createInventoryService } from "./inventory-service";

export const inventoryService = createInventoryService(db);

export const adjustInventory = inventoryService.adjustInventory;
export const decreaseInventory = inventoryService.decreaseInventory;
export const getInventoryForVariant = inventoryService.getInventoryForVariant;
export const increaseInventory = inventoryService.increaseInventory;
export const setInventory = inventoryService.setInventory;
