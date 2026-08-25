import "server-only";
import { cookies } from "next/headers";
import type { SessionUser } from "@pilotspos/types";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

/**
 * Obtiene la sesión actual desde un Server Component reenviando la cookie
 * de sesión a la API. Devuelve `null` si no hay sesión válida — nunca lanza.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieHeader = cookies().toString();
  if (!cookieHeader) return null;

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { user: SessionUser };
    return body.user;
  } catch {
    return null;
  }
}
