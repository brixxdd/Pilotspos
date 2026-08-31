import { requirePermission } from "@/lib/guards";
import { canPerformAction } from "@pilotspos/domain";
import { OrdersClient } from "./OrdersClient";

export default async function OrdersPage() {
  const user = await requirePermission("orders.view");
  const canManage = canPerformAction(user.role, "orders.manage");

  return <OrdersClient canManage={canManage} />;
}
