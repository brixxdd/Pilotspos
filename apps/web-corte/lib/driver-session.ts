import "server-only";
import { cookies } from "next/headers";
import type { SessionDriver } from "@pilotspos/types";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

/**
 * Sesión del repartidor en su portal (/r). Tercera identidad del sistema:
 * ni personal ni cliente final — un repartidor no pasa por permisos de staff.
 */
export async function getDriverSession(): Promise<SessionDriver | null> {
  const cookieHeader = cookies().toString();
  if (!cookieHeader) return null;

  try {
    const response = await fetch(`${API_URL}/public/drivers/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { driver: SessionDriver };
    return body.driver;
  } catch {
    return null;
  }
}
