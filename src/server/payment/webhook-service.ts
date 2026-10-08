import type { Prisma, PrismaClient } from "../../generated/prisma/client.ts";
import { InventoryError } from "../inventory/inventory-domain.ts";
import { decreaseInventoryInTransaction } from "../inventory/inventory-service.ts";

export type PaidCheckoutSessionEvent = {
  eventId: string;
  eventType: "checkout.session.completed";
  session: {
    id: string;
    livemode: boolean;
    paymentStatus: string;
    amountTotal: number | null;
    currency: string | null;
    clientReferenceId: string | null;
    orderId: string | null;
    orderNumber: string | null;
    paymentIntentId: string | null;
  };
};

export type WebhookResult = {
  outcome: string;
  orderNumber?: string;
};

const paymentInclude = {
  order: { include: { items: true } },
} as const;

async function claimEvent(
  transaction: Prisma.TransactionClient,
  event: PaidCheckoutSessionEvent,
) {
  const claim = await transaction.stripeWebhookEvent.createMany({
    data: [{ stripeEventId: event.eventId, eventType: event.eventType }],
    skipDuplicates: true,
  });
  return claim.count === 1;
}

async function completeEvent(
  transaction: Prisma.TransactionClient,
  eventId: string,
  outcomeCode: string,
) {
  await transaction.stripeWebhookEvent.update({
    where: { stripeEventId: eventId },
    data: { processedAt: new Date(), outcomeCode },
  });
}

function providerTruth(event: PaidCheckoutSessionEvent) {
  return {
    providerPaymentId: event.session.paymentIntentId,
    providerAmountCents: event.session.amountTotal,
    providerCurrency: event.session.currency?.toUpperCase() ?? null,
    status: "PAID" as const,
    failureCode: null,
    failureMessage: null,
  };
}

async function recordPaidException(
  database: PrismaClient,
  event: PaidCheckoutSessionEvent,
  code: string,
  message: string,
): Promise<WebhookResult> {
  return database.$transaction(async (transaction) => {
    if (!(await claimEvent(transaction, event))) return { outcome: "DUPLICATE_EVENT" };

    const payment = await transaction.payment.findUnique({
      where: { providerCheckoutSessionId: event.session.id },
      include: paymentInclude,
    });
    if (!payment) {
      await completeEvent(transaction, event.eventId, "UNKNOWN_SESSION");
      return { outcome: "UNKNOWN_SESSION" };
    }

    const claimed = await transaction.payment.updateMany({
      where: { id: payment.id, status: { in: ["PENDING", "FAILED"] } },
      data: providerTruth(event),
    });
    if (claimed.count === 0) {
      await completeEvent(transaction, event.eventId, "ALREADY_FINALIZED");
      return { outcome: "ALREADY_FINALIZED", orderNumber: payment.order.orderNumber };
    }

    await transaction.order.update({
      where: { id: payment.orderId },
      data: {
        paymentIssueCode: code,
        paymentIssueMessage: message,
        paymentIssueAt: new Date(),
      },
    });
    await completeEvent(transaction, event.eventId, code);
    return { outcome: code, orderNumber: payment.order.orderNumber };
  });
}

export function createWebhookProcessor(database: PrismaClient) {
  return async function processPaidCheckoutSession(
    event: PaidCheckoutSessionEvent,
  ): Promise<WebhookResult> {
    if (event.session.livemode) return { outcome: "LIVE_MODE_REJECTED" };

    try {
      return await database.$transaction(async (transaction) => {
        if (!(await claimEvent(transaction, event))) return { outcome: "DUPLICATE_EVENT" };

        const payment = await transaction.payment.findUnique({
          where: { providerCheckoutSessionId: event.session.id },
          include: paymentInclude,
        });
        if (!payment) {
          await completeEvent(transaction, event.eventId, "UNKNOWN_SESSION");
          return { outcome: "UNKNOWN_SESSION" };
        }

        const order = payment.order;
        const linkageMatches =
          event.session.clientReferenceId === order.id &&
          event.session.orderId === order.id &&
          event.session.orderNumber === order.orderNumber;

        if (event.session.paymentStatus !== "paid") {
          await completeEvent(transaction, event.eventId, "IGNORED_UNPAID");
          return { outcome: "IGNORED_UNPAID", orderNumber: order.orderNumber };
        }

        if (!linkageMatches) {
          const claimed = await transaction.payment.updateMany({
            where: { id: payment.id, status: { in: ["PENDING", "FAILED"] } },
            data: providerTruth(event),
          });
          if (claimed.count === 1) {
            await transaction.order.update({
              where: { id: order.id },
              data: {
                paymentIssueCode: "STRIPE_LINKAGE_MISMATCH",
                paymentIssueMessage: "A paid Stripe session did not match its internal order linkage.",
                paymentIssueAt: new Date(),
              },
            });
          }
          await completeEvent(transaction, event.eventId, "STRIPE_LINKAGE_MISMATCH");
          return { outcome: "STRIPE_LINKAGE_MISMATCH", orderNumber: order.orderNumber };
        }

        const currencyMatches = event.session.currency?.toUpperCase() === payment.currency;
        const amountMatches = event.session.amountTotal === payment.amountCents;
        if (!currencyMatches || !amountMatches) {
          const code = !currencyMatches ? "CURRENCY_MISMATCH" : "AMOUNT_MISMATCH";
          const claimed = await transaction.payment.updateMany({
            where: { id: payment.id, status: { in: ["PENDING", "FAILED"] } },
            data: providerTruth(event),
          });
          if (claimed.count === 1) {
            await transaction.order.update({
              where: { id: order.id },
              data: {
                paymentIssueCode: code,
                paymentIssueMessage: "The paid Stripe session did not match the expected order total.",
                paymentIssueAt: new Date(),
              },
            });
          }
          await completeEvent(transaction, event.eventId, code);
          return { outcome: code, orderNumber: order.orderNumber };
        }

        const claimed = await transaction.payment.updateMany({
          where: { id: payment.id, status: { in: ["PENDING", "FAILED"] } },
          data: providerTruth(event),
        });
        if (claimed.count === 0) {
          await completeEvent(transaction, event.eventId, "ALREADY_FINALIZED");
          return { outcome: "ALREADY_FINALIZED", orderNumber: order.orderNumber };
        }

        for (const item of order.items) {
          if (!item.productVariantId) throw new InventoryError("VARIANT_NOT_FOUND");
          await decreaseInventoryInTransaction(transaction, {
            variantId: item.productVariantId,
            quantity: item.quantity,
            reason: "ORDER",
            referenceType: "ORDER",
            referenceId: order.id,
          });
        }

        const advanced = await transaction.order.updateMany({
          where: { id: order.id, status: "PENDING" },
          data: {
            status: "PROCESSING",
            paymentIssueCode: null,
            paymentIssueMessage: null,
            paymentIssueAt: null,
          },
        });
        if (advanced.count !== 1) throw new Error("Order could not be advanced.");

        await transaction.orderStatusEvent.create({
          data: {
            orderId: order.id,
            fromStatus: "PENDING",
            toStatus: "PROCESSING",
            note: "Stripe payment confirmed and inventory committed.",
          },
        });
        await completeEvent(transaction, event.eventId, "PAYMENT_FINALIZED");
        return { outcome: "PAYMENT_FINALIZED", orderNumber: order.orderNumber };
      });
    } catch (error) {
      if (!(error instanceof InventoryError)) throw error;
      return recordPaidException(
        database,
        event,
        "PAID_REQUIRES_INVENTORY_REVIEW",
        "Payment was received, but inventory could not be committed. Manual review is required.",
      );
    }
  };
}

