import "server-only";
import { cookies } from "next/headers";
import type { SessionCustomer } from "@pilotspos/types";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

/**
 * Sesión del cliente final en el menú digital. Es el espejo de `getSession()`
 * pero contra `/customers/me`: son dos identidades distintas y una página
 * nunca debe usar una para decidir sobre la otra.
 */
export async function getCustomerSession(): Promise<SessionCustomer | null> {
  const cookieHeader = cookies().toString();
  if (!cookieHeader) return null;

  try {
    const response = await fetch(`${API_URL}/customers/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { customer: SessionCustomer };
    return body.customer;
  } catch {
    return null;
  }
}
