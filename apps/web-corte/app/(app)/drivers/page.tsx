import { cookies } from "next/headers";
import { requirePermission } from "@/lib/guards";
import type { Driver } from "@pilotspos/types";
import { DriversClient } from "./DriversClient";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

export default async function DriversPage() {
  await requirePermission("drivers.manage");

  const response = await fetch(`${API_URL}/drivers`, {
    headers: { cookie: cookies().toString() },
    cache: "no-store",
  });

  const body = response.ok ? ((await response.json()) as { drivers: Driver[] }) : { drivers: [] };

  return <DriversClient initialDrivers={body.drivers} />;
}
