import "server-only";

import { db } from "@/server/db/client";
import { createWebhookProcessor } from "@/server/payment/webhook-service";

export const processPaidCheckoutSession = createWebhookProcessor(db);

