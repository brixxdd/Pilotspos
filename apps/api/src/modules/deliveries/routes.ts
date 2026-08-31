import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { deliveryConfirmSchema, driverCreateSchema, driverUpdateSchema } from "@pilotspos/validation";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import {
  confirmDelivery,
  createDriver,
  getPublicDelivery,
  listDrivers,
  updateDriver,
} from "./service.js";

const tokenSchema = z.object({ token: z.string().min(16).max(64) });
const driverIdSchema = z.object({ id: z.string().uuid() });

/**
 * Entregas a domicilio.
 *
 * - Rutas públicas: el repartidor abre el QR del ticket y confirma con su
 *   teléfono (debe estar registrado y activo en el negocio). Solo lectura más
 *   la confirmación; nada de datos internos.
 * - Rutas de staff: administrar quién reparte (`drivers.manage`).
 */
export async function registerDeliveryRoutes(app: FastifyInstance) {
  app.get("/public/deliveries/:token", async (request, reply) => {
    const { token } = tokenSchema.parse(request.params);
    const delivery = await getPublicDelivery(token);
    // El QR se escanea una vez por entrega; una caché corta absorbe reescaneos.
    reply.header("Cache-Control", "no-store");
    return delivery;
  });

  app.post(
    "/public/deliveries/confirm",
    { config: { rateLimit: { max: 20, timeWindow: "10 minutes" } } },
    async (request) => {
      const input = deliveryConfirmSchema.parse(request.body);
      return confirmDelivery(input);
    },
  );

  app.get(
    "/drivers",
    { preHandler: [requireAuth, requirePermission("drivers.manage")] },
    async (request) => {
      const drivers = await listDrivers(request.authContext!.organizationId);
      return { drivers };
    },
  );

  app.post(
    "/drivers",
    { preHandler: [requireAuth, requirePermission("drivers.manage")] },
    async (request, reply) => {
      const input = driverCreateSchema.parse(request.body);
      const driver = await createDriver(request.authContext!.organizationId, input);
      reply.status(201);
      return { driver };
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/drivers/:id",
    { preHandler: [requireAuth, requirePermission("drivers.manage")] },
    async (request) => {
      const { id } = driverIdSchema.parse(request.params);
      const input = driverUpdateSchema.parse(request.body);
      const driver = await updateDriver(request.authContext!.organizationId, id, input);
      return { driver };
    },
  );
}
