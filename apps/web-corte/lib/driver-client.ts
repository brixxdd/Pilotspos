"use client";

import type { SessionDriver } from "@pilotspos/types";
import { apiFetch } from "./api-client";

/** Login del repartidor: teléfono + PIN. La cookie la maneja el navegador (same-origin). */
export async function loginDriver(input: { phone: string; pin: string }): Promise<SessionDriver> {
  const { driver } = await apiFetch<{ driver: SessionDriver }>("/public/drivers/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return driver;
}

export async function logoutDriver(): Promise<void> {
  await apiFetch("/public/drivers/logout", { method: "POST" });
}
