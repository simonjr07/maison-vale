import "server-only";

import { db } from "@/server/db/client";

import { createCartResolver } from "./cart-resolver";

export const resolveCart = createCartResolver(db);
