import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { InventoryClient } from "./InventoryClient";
import type { InventoryProductRow, MovementRow } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

async function apiGet<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { cookie: cookies().toString() },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

export default async function InventoryPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const [overview, movements] = await Promise.all([
    apiGet<{ items: InventoryProductRow[] }>("/inventory"),
    apiGet<{ items: MovementRow[] }>("/inventory/movements"),
  ]);

  return (
    <InventoryClient
      initialItems={overview?.items ?? []}
      initialMovements={movements?.items ?? []}
      role={user.role}
    />
  );
}
