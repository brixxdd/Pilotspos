import type { FastifyInstance } from "fastify";

/**
 * Punto central de registro de rutas por módulo de negocio.
 * Cada fase del desarrollo añade su `register*Routes` aquí.
 */
export async function registerModules(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok", service: "pilotspos-api" }));
}
