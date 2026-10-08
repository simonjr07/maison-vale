"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, requireUser } from "@/server/auth/authorization";
import { adminOrderListSchema, fulfillmentTransitionSchema } from "@/server/admin/order-domain";
import { AdminOrderError, createAdminOrderService } from "@/server/admin/order-service";
import { db } from "@/server/db/client";

const service = createAdminOrderService(db);

export type OrderListData = Awaited<ReturnType<typeof service.listOrders>>;
export type OrderListActionState = {
  status: "success" | "error";
  message: string;
  data: OrderListData;
};

export type OrderTransitionActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function searchOrdersAction(
  previousState: OrderListActionState,
  formData: FormData,
): Promise<OrderListActionState> {
  await requireUser();
  const parsed = adminOrderListSchema.safeParse({
    q: formData.get("q") ?? "",
    orderStatus: formData.get("orderStatus") ?? "ALL",
    paymentStatus: formData.get("paymentStatus") ?? "ALL",
    page: formData.get("page") ?? 1,
  });
  if (!parsed.success) {
    return { ...previousState, status: "error", message: "The order search could not be applied." };
  }
  try {
    return { status: "success", message: "", data: await service.listOrders(parsed.data) };
  } catch {
    return { ...previousState, status: "error", message: "Orders could not be loaded. Please try again." };
  }
}

export async function transitionOrderAction(
  previousState: OrderTransitionActionState,
  formData: FormData,
): Promise<OrderTransitionActionState> {
  void previousState;
  const actor = await requireAdmin();
  const parsed = fulfillmentTransitionSchema.safeParse({
    orderId: formData.get("orderId"),
    expectedStatus: formData.get("expectedStatus"),
    targetStatus: formData.get("targetStatus"),
  });
  if (!parsed.success) return { status: "error", message: "That fulfillment action is invalid." };

  try {
    const result = await service.transitionFulfillment(parsed.data, actor);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${result.orderId}`);
    revalidatePath(`/orders/${result.orderNumber}`);
    return {
      status: "success",
      message: result.status === "SHIPPED"
        ? "Manual dispatch was recorded. No carrier tracking was created."
        : "Manual delivery was recorded. This confirmation is not carrier-verified.",
    };
  } catch (error) {
    if (error instanceof AdminOrderError) return { status: "error", message: error.message };
    return { status: "error", message: "The fulfillment update could not be recorded." };
  }
}
