import type { FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerUserRoutes } from "./users/routes.js";
import { registerBranchRoutes } from "./branches/routes.js";
import { registerProductRoutes } from "./products/routes.js";
import { registerInventoryRoutes } from "./inventory/routes.js";
import { registerCashRoutes } from "./cash/routes.js";
import { registerSalesRoutes } from "./sales/routes.js";
import { registerReportsRoutes } from "./reports/routes.js";
import { registerMenuRoutes } from "./menu/routes.js";
import { registerCustomerRoutes } from "./customers/routes.js";

/**
 * Punto central de registro de rutas por módulo de negocio.
 * Cada fase del desarrollo añade su `register*Routes` aquí.
 */
export async function registerModules(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok", service: "pilotspos-api" }));

  // Cada módulo se registra en su propio contexto encapsulado de Fastify:
  // los hooks (p. ej. requireAuth/requireRole) que un módulo añade a `app`
  // solo aplican dentro de ese módulo, nunca al resto de la API.
  await app.register(registerAuthRoutes);
  await app.register(registerUserRoutes);
  await app.register(registerBranchRoutes);
  await app.register(registerProductRoutes);
  await app.register(registerInventoryRoutes);
  await app.register(registerCashRoutes);
  await app.register(registerSalesRoutes);
  await app.register(registerReportsRoutes);
  // Público, sin sesión: el menú digital que abre el cliente final.
  await app.register(registerMenuRoutes);
  // Cuentas de los clientes finales (menú digital y fiado). Sesión propia,
  // separada de la del personal — ver modules/customers/cookie.ts.
  await app.register(registerCustomerRoutes);
}
