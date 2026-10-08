import type { Metadata } from "next";
import { cookies } from "next/headers";

import { OrderAccessRequired, OrderDetails } from "@/components/orders/order-details";
import { ORDER_LOOKUP_COOKIE } from "@/order/order-lookup-domain";
import { getOrderLookupService } from "@/server/order/order-lookup";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const [{ orderNumber }, cookieStore] = await Promise.all([params, cookies()]);
  const service = getOrderLookupService();
  const details = service
    ? await service.getOrderDetails(
        orderNumber,
        cookieStore.get(ORDER_LOOKUP_COOKIE)?.value,
      )
    : null;

  return details ? <OrderDetails order={details} /> : <OrderAccessRequired />;
}

