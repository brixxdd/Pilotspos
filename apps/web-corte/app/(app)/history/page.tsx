import { cookies } from "next/headers";
import { requireSession } from "@/lib/guards";
import { HistoryClient, type SaleRow } from "./HistoryClient";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

export default async function HistoryPage() {
  const user = await requireSession();

  const response = await fetch(`${API_URL}/sales?userId=${user.id}&pageSize=50`, {
    headers: { cookie: cookies().toString() },
    cache: "no-store",
  });

  const body = response.ok ? ((await response.json()) as { items: SaleRow[] }) : { items: [] };

  return <HistoryClient initialSales={body.items} />;
}
