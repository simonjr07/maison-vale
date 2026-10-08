import { z } from "zod";

export const ADMIN_ORDER_PAGE_SIZE = 15;

const orderStatuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
const paymentStatuses = ["PENDING", "PAID", "FAILED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

export const adminOrderListSchema = z.object({
  q: z.string().trim().max(320).catch(""),
  orderStatus: z.enum(["ALL", ...orderStatuses]).catch("ALL"),
  paymentStatus: z.enum(["ALL", ...paymentStatuses]).catch("ALL"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
}).strict();

export const orderIdSchema = z.string().uuid("The order identifier is invalid.");

export const fulfillmentTransitionSchema = z.object({
  orderId: orderIdSchema,
  expectedStatus: z.enum(["PROCESSING", "SHIPPED"]),
  targetStatus: z.enum(["SHIPPED", "DELIVERED"]),
}).strict().superRefine((value, context) => {
  if (!isPermittedTransition(value.expectedStatus, value.targetStatus)) {
    context.addIssue({ code: "custom", path: ["targetStatus"], message: "That fulfillment transition is not permitted." });
  }
});

export type AdminOrderListInput = z.infer<typeof adminOrderListSchema>;
export type FulfillmentTransitionInput = z.infer<typeof fulfillmentTransitionSchema>;

export function canManageOrders(role: "ADMIN" | "STAFF") {
  return role === "ADMIN";
}

export function isPermittedTransition(currentStatus: string, targetStatus: string) {
  return (currentStatus === "PROCESSING" && targetStatus === "SHIPPED")
    || (currentStatus === "SHIPPED" && targetStatus === "DELIVERED");
}

export function getNextFulfillmentTransition(status: string) {
  if (status === "PROCESSING") return { targetStatus: "SHIPPED" as const, label: "Confirm manual dispatch" };
  if (status === "SHIPPED") return { targetStatus: "DELIVERED" as const, label: "Confirm manual delivery" };
  return null;
}

export function getFulfillmentBlockReason(input: {
  orderStatus: string;
  paymentStatus: string | null;
  paymentIssueCode: string | null;
}) {
  if (input.paymentIssueCode) return "This order requires payment or inventory review before fulfillment can continue.";
  if (input.paymentStatus !== "PAID") return "Fulfillment cannot advance until payment is verified as paid.";
  if (!getNextFulfillmentTransition(input.orderStatus)) return "No manual fulfillment action is available for this order state.";
  return null;
}

export const orderStatusLabels: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped manually",
  DELIVERED: "Delivered manually",
  CANCELLED: "Cancelled",
};

export const paymentStatusLabels: Record<string, string> = {
  PENDING: "Payment pending",
  PAID: "Paid",
  FAILED: "Payment failed",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded",
};

export function getPaymentReviewLabel(issueCode: string | null) {
  if (!issueCode) return null;
  if (issueCode === "PAID_REQUIRES_INVENTORY_REVIEW") return "Paid · inventory review required";
  return "Payment verification review required";
}
