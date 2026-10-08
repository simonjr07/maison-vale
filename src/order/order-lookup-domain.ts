import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const ORDER_LOOKUP_SESSION_SECONDS = 15 * 60;
export const ORDER_LOOKUP_COOKIE = "maison-vale-order-lookup";

const orderNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^MV-\d{8}-[A-F0-9]{8}$/, "Enter a valid Maison Vale order reference.");

export const orderLookupSchema = z.object({
  orderNumber: orderNumberSchema,
  email: z
    .string()
    .trim()
    .max(320)
    .email("Enter the email used at checkout.")
    .transform((value) => value.toLowerCase()),
}).strip();

const sessionPayloadSchema = z.object({
  version: z.literal(1),
  orderScope: z.string().regex(/^[a-f0-9]{64}$/),
  expiresAt: z.number().int().positive(),
}).strict();

export type OrderLookupInput = z.infer<typeof orderLookupSchema>;
export type LookupSessionPayload = z.infer<typeof sessionPayloadSchema>;

function hmac(value: string, secret: string, context: string) {
  return createHmac("sha256", secret).update(`${context}\0${value}`).digest();
}

function safeEqual(left: Buffer, right: Buffer) {
  return left.length === right.length && timingSafeEqual(left, right);
}

export function normalizeOrderNumber(value: unknown) {
  return orderNumberSchema.safeParse(value);
}

export function emailMatchesProof(provided: string, expected: string | null, secret: string) {
  const left = hmac(provided, secret, "order-lookup-email");
  const right = hmac(expected ?? "missing-order-dummy", secret, "order-lookup-email");
  return safeEqual(left, right) && expected !== null;
}

function createOrderScope(orderId: string, secret: string) {
  return hmac(orderId, secret, "order-lookup-scope").toString("hex");
}

export function orderScopeMatches(orderId: string, scope: string, secret: string) {
  return safeEqual(
    Buffer.from(createOrderScope(orderId, secret), "hex"),
    Buffer.from(scope, "hex"),
  );
}

export function createLookupSession(
  orderId: string,
  secret: string,
  now = new Date(),
) {
  const payload: LookupSessionPayload = {
    version: 1,
    orderScope: createOrderScope(orderId, secret),
    expiresAt: Math.floor(now.getTime() / 1000) + ORDER_LOOKUP_SESSION_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = hmac(encoded, secret, "order-lookup-session").toString("base64url");
  return { token: `${encoded}.${signature}`, expiresAt: payload.expiresAt };
}

export function verifyLookupSession(
  token: string | undefined,
  secret: string,
  now = new Date(),
): LookupSessionPayload | null {
  if (!token || token.length > 1024) return null;
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return null;

  const expected = hmac(encoded, secret, "order-lookup-session");
  let supplied: Buffer;
  try {
    supplied = Buffer.from(suppliedSignature, "base64url");
  } catch {
    return null;
  }
  if (!safeEqual(supplied, expected)) return null;

  try {
    const parsed = sessionPayloadSchema.safeParse(
      JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")),
    );
    if (!parsed.success) return null;
    if (parsed.data.expiresAt <= Math.floor(now.getTime() / 1000)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export type PublicPaymentState =
  | "PENDING"
  | "CONFIRMED"
  | "FAILED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

export function mapPaymentState(status: string | null): PublicPaymentState {
  if (status === "PAID") return "CONFIRMED";
  if (status === "FAILED") return "FAILED";
  if (status === "PARTIALLY_REFUNDED") return "PARTIALLY_REFUNDED";
  if (status === "REFUNDED") return "REFUNDED";
  return "PENDING";
}

export type PublicFulfillmentState =
  | "AWAITING_PAYMENT"
  | "REVIEW_REQUIRED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export function mapFulfillmentState(input: {
  orderStatus: string;
  paymentStatus: string | null;
  paymentIssueCode: string | null;
}): PublicFulfillmentState {
  if (input.orderStatus === "CANCELLED") return "CANCELLED";
  if (input.paymentIssueCode) return "REVIEW_REQUIRED";
  if (input.orderStatus === "PROCESSING") return "PROCESSING";
  if (input.orderStatus === "SHIPPED") return "SHIPPED";
  if (input.orderStatus === "DELIVERED") return "DELIVERED";
  if (input.paymentStatus === "PAID") return "REVIEW_REQUIRED";
  return "AWAITING_PAYMENT";
}

export function maskShippingName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "Customer";
  return `${parts[0]} ${parts.at(-1)?.slice(0, 1)}.`;
}

export function maskPostalCode(postalCode: string) {
  const prefix = postalCode.trim().slice(0, 3);
  return prefix ? `${prefix}••` : "•••••";
}

const statusLabels: Record<string, string> = {
  PENDING: "Order received",
  PROCESSING: "Preparing order",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export type OrderRecordForPublicView = {
  orderNumber: string;
  status: string;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingName: string;
  shippingCity: string;
  shippingRegion: string | null;
  shippingPostalCode: string;
  shippingCountry: string;
  paymentIssueCode: string | null;
  createdAt: Date;
  items: Array<{
    productName: string;
    variantName: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
  }>;
  payments: Array<{ status: string; createdAt: Date }>;
  statusEvents: Array<{ toStatus: string; createdAt: Date }>;
};

export function toPublicOrderDetails(order: OrderRecordForPublicView) {
  const payment = order.payments[0] ?? null;
  return {
    orderNumber: order.orderNumber,
    placedAt: order.createdAt.toISOString(),
    currency: order.currency,
    paymentState: mapPaymentState(payment?.status ?? null),
    fulfillmentState: mapFulfillmentState({
      orderStatus: order.status,
      paymentStatus: payment?.status ?? null,
      paymentIssueCode: order.paymentIssueCode,
    }),
    items: order.items.map((item) => ({
      productName: item.productName,
      variantName: item.variantName,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
    })),
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    destination: {
      recipient: maskShippingName(order.shippingName),
      locality: [order.shippingCity, order.shippingRegion].filter(Boolean).join(", "),
      postalCode: maskPostalCode(order.shippingPostalCode),
      country: order.shippingCountry === "US" ? "United States" : order.shippingCountry,
    },
    timeline: order.statusEvents.map((event) => ({
      label: statusLabels[event.toStatus] ?? "Order updated",
      occurredAt: event.createdAt.toISOString(),
    })),
  };
}

export type PublicOrderDetails = ReturnType<typeof toPublicOrderDetails>;

