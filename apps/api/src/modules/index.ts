import type { FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerUserRoutes } from "./users/routes.js";
import { registerProductRoutes } from "./products/routes.js";

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
  await app.register(registerProductRoutes);
}
