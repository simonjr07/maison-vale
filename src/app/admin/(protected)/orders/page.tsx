import { AdminOrderList } from "@/components/admin/order-list";
import { createAdminOrderService } from "@/server/admin/order-service";
import { requireUser } from "@/server/auth/authorization";
import { db } from "@/server/db/client";

export const instant = false;

export default async function AdminOrdersPage() {
  await requireUser();
  const data = await createAdminOrderService(db).listOrders({ q: "", orderStatus: "ALL", paymentStatus: "ALL", page: 1 });
  return <main><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a5a3b]">Fulfillment</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Orders</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#25231f]/60">Review verified payment state, customer fulfillment details, and manual dispatch history. Search terms are submitted securely and are not placed in the URL.</p><AdminOrderList initialState={{ status: "success", message: "", data }} /></main>;
}
