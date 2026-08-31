import { cookies } from "next/headers";
import { requirePermission } from "@/lib/guards";
import { canPerformAction } from "@pilotspos/domain";
import type { CustomerListItem } from "@pilotspos/types";
import { ClientsClient } from "./ClientsClient";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

export default async function ClientsPage() {
  const user = await requirePermission("customers.view");
  const canManage = canPerformAction(user.role, "customers.manage");

  const cookie = cookies().toString();
  const response = await fetch(`${API_URL}/customers?pageSize=100`, {
    headers: { cookie },
    cache: "no-store",
  });

  const body = response.ok ? ((await response.json()) as { items: CustomerListItem[] }) : { items: [] };

  return <ClientsClient initialCustomers={body.items} canManage={canManage} />;
}
