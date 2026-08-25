import "server-only";
import { redirect } from "next/navigation";
import { canPerformAction, type PermissionAction } from "@pilotspos/domain";
import type { SessionUser } from "@pilotspos/types";
import { getSession } from "./session";

/**
 * Pantalla a la que se manda a cada rol cuando entra a una ruta que no le
 * corresponde. El cajero vive en el punto de venta; los demás en el panel.
 */
function homeFor(role: SessionUser["role"]): string {
  return role === "CASHIER" ? "/sales" : "/dashboard";
}

/** Exige sesión iniciada. Redirige al login si no hay. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/**
 * Exige un permiso concreto para renderizar la página.
 *
 * El backend ya rechaza las acciones sin permiso (ver `requirePermission` en
 * apps/api/src/middleware/auth.ts), pero sin este guard un cajero que escriba
 * `/products` en la barra de direcciones veía la pantalla vacía en vez de un
 * rechazo. Aquí se corta antes de renderizar.
 *
 * Misma matriz de `@pilotspos/domain` que usa la API — una sola fuente de verdad.
 */
export async function requirePermission(action: PermissionAction): Promise<SessionUser> {
  const user = await requireSession();
  if (!canPerformAction(user.role, action)) {
    redirect(homeFor(user.role));
  }
  return user;
}
