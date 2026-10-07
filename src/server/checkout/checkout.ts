import "server-only";

import { db } from "@/server/db/client";

import { createCheckoutService } from "./checkout-resolver";

const checkoutService = createCheckoutService(db);

export const quoteCheckout = checkoutService.quoteCheckout;
export const prepareCheckout = checkoutService.prepareCheckout;
