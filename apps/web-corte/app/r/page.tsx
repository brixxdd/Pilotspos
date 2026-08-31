import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DriverDeliveryRecord } from "@pilotspos/types";
import { getDriverSession } from "@/lib/driver-session";
import { ProfileClient } from "./ProfileClient";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

export const metadata = { title: "Mis entregas" };

export default async function DriverPortalPage() {
  const driver = await getDriverSession();
  if (!driver) redirect("/r/entrar");

  const response = await fetch(`${API_URL}/public/drivers/me/deliveries`, {
    headers: { cookie: cookies().toString() },
    cache: "no-store",
  });
  const body = response.ok ? ((await response.json()) as { items: DriverDeliveryRecord[] }) : { items: [] };

  return <ProfileClient driver={driver} initialDeliveries={body.items} />;
}
