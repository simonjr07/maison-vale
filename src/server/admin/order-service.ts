import type { Prisma, PrismaClient } from "../../generated/prisma/client.ts";

import {
  ADMIN_ORDER_PAGE_SIZE,
  type AdminOrderListInput,
  type FulfillmentTransitionInput,
  fulfillmentTransitionSchema,
  getFulfillmentBlockReason,
  getPaymentReviewLabel,
  orderStatusLabels,
  paymentStatusLabels,
} from "./order-domain.ts";

export class AdminOrderError extends Error {
  readonly code: "NOT_FOUND" | "INVALID_TRANSITION" | "PAYMENT_REQUIRED" | "REVIEW_REQUIRED" | "CONCURRENT_MODIFICATION" | "DATABASE_FAILURE";

  constructor(code: AdminOrderError["code"], message: string) {
    super(message);
    this.name = "AdminOrderError";
    this.code = code;
  }
}

function latestPayment<T extends { payments: Array<unknown> }>(order: T) {
  return order.payments[0] ?? null;
}

function statusBadge(status: string) {
  return orderStatusLabels[status] ?? "Unknown";
}

function paymentBadge(status: string | undefined, issueCode: string | null) {
  return getPaymentReviewLabel(issueCode) ?? paymentStatusLabels[status ?? "PENDING"] ?? "Payment pending";
}

export function createAdminOrderService(database: PrismaClient) {
  async function listOrders(input: AdminOrderListInput) {
    const where: Prisma.OrderWhereInput = {
      ...(input.q ? { OR: [
        { orderNumber: { contains: input.q, mode: "insensitive" as const } },
        { email: { contains: input.q, mode: "insensitive" as const } },
      ] } : {}),
      ...(input.orderStatus !== "ALL" ? { status: input.orderStatus } : {}),
      ...(input.paymentStatus !== "ALL" ? { payments: { some: { status: input.paymentStatus } } } : {}),
    };
    const [total, rows] = await Promise.all([
      database.order.count({ where }),
      database.order.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { orderNumber: "desc" }],
        skip: (input.page - 1) * ADMIN_ORDER_PAGE_SIZE,
        take: ADMIN_ORDER_PAGE_SIZE,
        select: {
          id: true, orderNumber: true, email: true, shippingName: true, status: true,
          currency: true, totalCents: true, paymentIssueCode: true, createdAt: true,
          payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
        },
      }),
    ]);
    return {
      query: input,
      total,
      page: input.page,
      pageCount: Math.max(1, Math.ceil(total / ADMIN_ORDER_PAGE_SIZE)),
      orders: rows.map((order) => {
        const payment = latestPayment(order) as { status: string } | null;
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          email: order.email,
          customerName: order.shippingName,
          orderStatus: order.status,
          orderStatusLabel: statusBadge(order.status),
          paymentStatus: payment?.status ?? "PENDING",
          paymentStatusLabel: paymentBadge(payment?.status, order.paymentIssueCode),
          requiresReview: Boolean(order.paymentIssueCode),
          currency: order.currency,
          totalCents: order.totalCents,
          createdAt: order.createdAt.toISOString(),
        };
      }),
    };
  }

  async function getOrder(id: string) {
    const order = await database.order.findUnique({
      where: { id },
      select: {
        id: true, orderNumber: true, email: true, status: true, currency: true,
        subtotalCents: true, shippingCents: true, taxCents: true, totalCents: true,
        shippingName: true, shippingLine1: true, shippingLine2: true, shippingCity: true,
        shippingRegion: true, shippingPostalCode: true, shippingCountry: true,
        paymentIssueCode: true, createdAt: true, updatedAt: true,
        items: { orderBy: { createdAt: "asc" }, select: {
          id: true, productName: true, variantName: true, sku: true,
          unitPriceCents: true, quantity: true, lineTotalCents: true,
        } },
        payments: { orderBy: { createdAt: "desc" }, select: {
          id: true, status: true, amountCents: true, currency: true, createdAt: true, updatedAt: true,
          refunds: { select: { amountCents: true, createdAt: true }, orderBy: { createdAt: "asc" } },
        } },
        statusEvents: { orderBy: { createdAt: "asc" }, select: {
          id: true, fromStatus: true, toStatus: true, note: true, createdAt: true,
        } },
      },
    });
    if (!order) return null;
    const payment = order.payments[0] ?? null;
    return {
      ...order,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      paymentStatus: payment?.status ?? null,
      paymentStatusLabel: paymentBadge(payment?.status, order.paymentIssueCode),
      orderStatusLabel: statusBadge(order.status),
      paymentReviewLabel: getPaymentReviewLabel(order.paymentIssueCode),
      items: order.items.map((item) => ({ ...item })),
      payments: order.payments.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(), updatedAt: entry.updatedAt.toISOString(),
        refunds: entry.refunds.map((refund) => ({ ...refund, createdAt: refund.createdAt.toISOString() })),
      })),
      statusEvents: order.statusEvents.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
    };
  }

  async function transitionFulfillment(input: FulfillmentTransitionInput, actor: { id: string; email: string }) {
    const parsed = fulfillmentTransitionSchema.safeParse(input);
    if (!parsed.success) throw new AdminOrderError("INVALID_TRANSITION", "That fulfillment transition is not permitted.");

    try {
      return await database.$transaction(async (transaction) => {
        const order = await transaction.order.findUnique({
          where: { id: parsed.data.orderId },
          select: {
            id: true, orderNumber: true, status: true, paymentIssueCode: true,
            payments: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true } },
          },
        });
        if (!order) throw new AdminOrderError("NOT_FOUND", "The order was not found.");
        if (order.status !== parsed.data.expectedStatus) {
          throw new AdminOrderError("CONCURRENT_MODIFICATION", "The order changed before this action was recorded. Review the latest status and try again.");
        }
        const payment = order.payments[0] ?? null;
        const blockReason = getFulfillmentBlockReason({
          orderStatus: order.status,
          paymentStatus: payment?.status ?? null,
          paymentIssueCode: order.paymentIssueCode,
        });
        if (blockReason) {
          throw new AdminOrderError(order.paymentIssueCode ? "REVIEW_REQUIRED" : "PAYMENT_REQUIRED", blockReason);
        }

        const advanced = await transaction.order.updateMany({
          where: {
            id: order.id,
            status: parsed.data.expectedStatus,
            paymentIssueCode: null,
            payments: { some: { id: payment!.id, status: "PAID" } },
          },
          data: { status: parsed.data.targetStatus },
        });
        if (advanced.count !== 1) {
          throw new AdminOrderError("CONCURRENT_MODIFICATION", "The order or payment changed before this action was recorded. Review the latest status and try again.");
        }

        const note = parsed.data.targetStatus === "SHIPPED"
          ? `Manual dispatch confirmed by ${actor.email}. Carrier tracking is not connected.`
          : `Manual delivery confirmed by ${actor.email}. This status is not carrier-verified.`;
        const event = await transaction.orderStatusEvent.create({
          data: {
            orderId: order.id,
            fromStatus: parsed.data.expectedStatus,
            toStatus: parsed.data.targetStatus,
            note,
          },
          select: { id: true, createdAt: true },
        });
        return { orderId: order.id, orderNumber: order.orderNumber, status: parsed.data.targetStatus, event };
      });
    } catch (error) {
      if (error instanceof AdminOrderError) throw error;
      throw new AdminOrderError("DATABASE_FAILURE", "The fulfillment update could not be recorded.");
    }
  }

  return { getOrder, listOrders, transitionFulfillment };
}
