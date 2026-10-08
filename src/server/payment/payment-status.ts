import "server-only";

import { deriveCustomerPaymentState } from "@/payment/payment-status";
import { db } from "@/server/db/client";

const sessionIdPattern = /^cs_(?:test_|live_)?[A-Za-z0-9_]+$/;

export async function getCustomerPaymentStatus(sessionId: string | undefined) {
  if (!sessionId || sessionId.length > 255 || !sessionIdPattern.test(sessionId)) {
    return { state: "UNVERIFIED" as const, orderNumber: null };
  }

  const payment = await db.payment.findUnique({
    where: { providerCheckoutSessionId: sessionId },
    select: {
      status: true,
      order: {
        select: { orderNumber: true, status: true, paymentIssueCode: true },
      },
    },
  });
  if (!payment) return { state: "UNVERIFIED" as const, orderNumber: null };

  return {
    state: deriveCustomerPaymentState({
      paymentStatus: payment.status,
      orderStatus: payment.order.status,
      paymentIssueCode: payment.order.paymentIssueCode,
    }),
    orderNumber: payment.order.orderNumber,
  };
}

