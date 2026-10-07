import type Stripe from "stripe";

import type { PrismaClient } from "../../generated/prisma/client.ts";
import {
  createCheckoutFingerprint,
  createStripeLineItems,
  generateOrderNumber,
  hashCheckoutAttempt,
  PaymentError,
  checkoutSessionRequestSchema,
  type CheckoutSessionResult,
} from "../../payment/payment-domain.ts";
import { CheckoutValidationError, createCheckoutService } from "../checkout/checkout-resolver.ts";

export type StripeCheckoutGateway = {
  create(
    params: Stripe.Checkout.SessionCreateParams,
    options: { idempotencyKey: string },
  ): Promise<Stripe.Checkout.Session>;
  retrieve(id: string): Promise<Stripe.Checkout.Session>;
};

type Dependencies = {
  database: PrismaClient;
  stripe: StripeCheckoutGateway;
  consumeAttempt: (email: string, source: string) => Promise<boolean>;
  attemptSecret: string;
};

const orderInclude = {
  items: true,
  payments: { where: { provider: "STRIPE" as const }, take: 1 },
} as const;

function isUniqueConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export function createCheckoutSessionService(dependencies: Dependencies) {
  const checkoutService = createCheckoutService(dependencies.database);

  return async function createCheckoutSession(
    input: unknown,
    context: { source: string; appOrigin: string },
  ): Promise<CheckoutSessionResult> {
    const parsed = checkoutSessionRequestSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".") || "form";
        fieldErrors[path] = [...(fieldErrors[path] ?? []), issue.message];
      }
      throw new CheckoutValidationError(fieldErrors);
    }

    if (!(await dependencies.consumeAttempt(parsed.data.contact.email, context.source))) {
      throw new PaymentError(
        "CHECKOUT_RATE_LIMITED",
        "Too many checkout attempts. Please wait before trying again.",
      );
    }

    const prepared = await checkoutService.prepareCheckout(input);
    const attemptHash = hashCheckoutAttempt(parsed.data.attemptToken, dependencies.attemptSecret);
    const fingerprint = createCheckoutFingerprint(parsed.data, prepared);

    let order = await dependencies.database.order.findUnique({
      where: { checkoutAttemptHash: attemptHash },
      include: orderInclude,
    });

    if (order && order.checkoutFingerprint !== fingerprint) {
      throw new PaymentError(
        "CHECKOUT_ATTEMPT_CONFLICT",
        "Checkout details changed. Start a new payment attempt.",
      );
    }

    const existingPayment = order?.payments[0];
    if (order && existingPayment?.providerCheckoutSessionId) {
      const existingSession = await dependencies.stripe.retrieve(
        existingPayment.providerCheckoutSessionId,
      );
      if (!existingSession.url) {
        throw new PaymentError("CHECKOUT_SESSION_FAILED", "Secure payment could not be opened.");
      }
      return { orderNumber: order.orderNumber, url: existingSession.url };
    }

    if (!order) {
      const variantIds = prepared.items.map((item) => item.variantId);
      const variants = await dependencies.database.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, sku: true },
      });
      const skuByVariant = new Map(variants.map((variant) => [variant.id, variant.sku]));
      if (skuByVariant.size !== variantIds.length) {
        throw new PaymentError("CHECKOUT_SESSION_FAILED", "Checkout is no longer available.");
      }

      try {
        order = await dependencies.database.$transaction((transaction) => transaction.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            email: parsed.data.contact.email,
            status: "PENDING",
            currency: prepared.currency,
            subtotalCents: prepared.subtotalCents,
            shippingCents: prepared.shippingCents,
            taxCents: prepared.taxCents,
            totalCents: prepared.totalCents,
            shippingName: parsed.data.shippingAddress.fullName,
            shippingLine1: parsed.data.shippingAddress.line1,
            shippingLine2: parsed.data.shippingAddress.line2,
            shippingCity: parsed.data.shippingAddress.city,
            shippingRegion: parsed.data.shippingAddress.region,
            shippingPostalCode: parsed.data.shippingAddress.postalCode,
            shippingCountry: parsed.data.shippingAddress.country,
            checkoutAttemptHash: attemptHash,
            checkoutFingerprint: fingerprint,
            items: {
              create: prepared.items.map((item) => ({
                productVariantId: item.variantId,
                productName: item.productName,
                variantName: item.variantName,
                sku: skuByVariant.get(item.variantId)!,
                unitPriceCents: item.unitPriceCents!,
                quantity: item.quantity,
                lineTotalCents: item.lineTotalCents,
              })),
            },
            payments: {
              create: {
                provider: "STRIPE",
                status: "PENDING",
                amountCents: prepared.totalCents,
                currency: prepared.currency,
              },
            },
          },
          include: orderInclude,
        }));
      } catch (error) {
        if (!isUniqueConflict(error)) throw error;
        order = await dependencies.database.order.findUnique({
          where: { checkoutAttemptHash: attemptHash },
          include: orderInclude,
        });
        if (!order || order.checkoutFingerprint !== fingerprint) {
          throw new PaymentError(
            "CHECKOUT_ATTEMPT_CONFLICT",
            "Checkout details changed. Start a new payment attempt.",
          );
        }
      }
    }

    const payment = order.payments[0];
    if (!payment) throw new Error("Stripe payment record is missing.");

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = createStripeLineItems({
      currency: order.currency,
      shippingCents: order.shippingCents,
      items: order.items,
    });

    try {
      const session = await dependencies.stripe.create(
        {
          mode: "payment",
          allowed_payment_method_types: ["card"],
          customer_email: order.email,
          client_reference_id: order.id,
          line_items: lineItems,
          metadata: { orderId: order.id, orderNumber: order.orderNumber },
          success_url: `${context.appOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${context.appOrigin}/checkout/cancel`,
        },
        { idempotencyKey: `checkout_${attemptHash}` },
      );
      if (!session.url || session.livemode) {
        throw new Error("Stripe returned an unusable Checkout Session.");
      }

      await dependencies.database.payment.update({
        where: { id: payment.id },
        data: {
          providerCheckoutSessionId: session.id,
          providerPaymentId:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
          status: "PENDING",
          failureCode: null,
          failureMessage: null,
        },
      });
      return { orderNumber: order.orderNumber, url: session.url };
    } catch (error) {
      await dependencies.database.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureCode: "CHECKOUT_SESSION_CREATION_FAILED",
          failureMessage: "Stripe Checkout Session creation did not complete.",
        },
      });
      if (error instanceof PaymentError) throw error;
      throw new PaymentError(
        "CHECKOUT_SESSION_FAILED",
        "Secure payment could not be started. Please try again.",
      );
    }
  };
}

