import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPublicBusiness, getPublicMenu } from "./service.js";

const slug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, "Slug inválido");

const menuParamsSchema = z.object({ orgSlug: slug, branchSlug: slug });
const businessParamsSchema = z.object({ orgSlug: slug });

/**
 * Menú digital público. A diferencia del resto de la API, este módulo NO
 * registra `requireAuth`: lo abre cualquier cliente desde el QR del mostrador
 * o un link de WhatsApp. Solo lectura, y `service.ts` limita los campos que
 * salen. No agregar aquí rutas que escriban ni que expongan datos internos.
 */
export async function registerMenuRoutes(app: FastifyInstance) {
  app.get("/public/menu/:orgSlug/:branchSlug", async (request, reply) => {
    const { orgSlug, branchSlug } = menuParamsSchema.parse(request.params);
    const menu = await getPublicMenu(orgSlug, branchSlug);

    // Los precios cambian a diario, no por minuto: media hora de caché en el
    // borde absorbe la ráfaga de un letrero con QR sin servir precios viejos.
    reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=1800");
    return menu;
  });

  app.get("/public/business/:orgSlug", async (request, reply) => {
    const { orgSlug } = businessParamsSchema.parse(request.params);
    const business = await getPublicBusiness(orgSlug);
    reply.header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    return business;
  });
}
