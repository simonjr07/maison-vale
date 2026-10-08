import type { PrismaClient } from "../../generated/prisma/client.ts";
import {
  createLookupSession,
  emailMatchesProof,
  normalizeOrderNumber,
  orderScopeMatches,
  orderLookupSchema,
  toPublicOrderDetails,
  verifyLookupSession,
} from "../../order/order-lookup-domain.ts";

export class OrderLookupValidationError extends Error {
  constructor() {
    super("Enter a valid order reference and checkout email.");
    this.name = "OrderLookupValidationError";
  }
}

export class OrderLookupDeniedError extends Error {
  constructor() {
    super("We could not verify those order details.");
    this.name = "OrderLookupDeniedError";
  }
}

export class OrderLookupRateLimitError extends Error {
  constructor() {
    super("Too many lookup attempts. Please wait before trying again.");
    this.name = "OrderLookupRateLimitError";
  }
}

type LookupRateLimiter = (input: {
  orderNumber: string;
  email: string;
  source: string;
}) => Promise<boolean>;

export function createOrderLookupService(
  database: PrismaClient,
  options: { secret: string; consumeAttempt: LookupRateLimiter },
) {
  async function verifyOrder(input: unknown, source: string) {
    const parsed = orderLookupSchema.safeParse(input);
    if (!parsed.success) throw new OrderLookupValidationError();

    const allowed = await options.consumeAttempt({ ...parsed.data, source });
    if (!allowed) throw new OrderLookupRateLimitError();

    const order = await database.order.findUnique({
      where: { orderNumber: parsed.data.orderNumber },
      select: { id: true, email: true },
    });
    if (!emailMatchesProof(parsed.data.email, order?.email ?? null, options.secret)) {
      throw new OrderLookupDeniedError();
    }

    const session = createLookupSession(order!.id, options.secret);
    return {
      orderNumber: parsed.data.orderNumber,
      token: session.token,
      expiresAt: session.expiresAt,
    };
  }

  async function getOrderDetails(
    orderNumberInput: unknown,
    token: string | undefined,
    now = new Date(),
  ) {
    const orderNumber = normalizeOrderNumber(orderNumberInput);
    if (!orderNumber.success) return null;
    const session = verifyLookupSession(token, options.secret, now);
    if (!session) return null;

    const order = await database.order.findUnique({
      where: { orderNumber: orderNumber.data },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        currency: true,
        subtotalCents: true,
        shippingCents: true,
        taxCents: true,
        totalCents: true,
        shippingName: true,
        shippingCity: true,
        shippingRegion: true,
        shippingPostalCode: true,
        shippingCountry: true,
        paymentIssueCode: true,
        createdAt: true,
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            productName: true,
            variantName: true,
            unitPriceCents: true,
            quantity: true,
            lineTotalCents: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, createdAt: true },
        },
        statusEvents: {
          orderBy: { createdAt: "asc" },
          select: { toStatus: true, createdAt: true },
        },
      },
    });
    if (!order || !orderScopeMatches(order.id, session.orderScope, options.secret)) {
      return null;
    }
    return toPublicOrderDetails(order);
  }

  return { getOrderDetails, verifyOrder };
}

