import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";
import {
  deliveryConfirmSchema,
  deliveryReceivedSchema,
  driverCreateSchema,
  driverLoginSchema,
  driverUpdateSchema,
} from "@pilotspos/validation";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../shared/errors.js";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { clearDriverCookie, setDriverCookie } from "./cookie.js";
import { deleteDriverSession, resolveDriverSession } from "./session.service.js";
import {
  confirmDelivery,
  confirmReceived,
  createDriver,
  getPublicDelivery,
  listDriverDeliveries,
  listDrivers,
  loginDriver,
  updateDriver,
} from "./service.js";

const tokenSchema = z.object({ token: z.string().min(16).max(64) });
const driverIdSchema = z.object({ id: z.string().uuid() });

/**
 * Adjunta `request.driverContext` leyendo la cookie del portal del repartidor.
 * Igual que los otros contextos: no rechaza por sí solo.
 */
export const driverContextPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest("driverContext", null);

  app.addHook("onRequest", async (request: FastifyRequest) => {
    const rawCookie = request.cookies[env.DRIVER_COOKIE_NAME];
    if (!rawCookie) {
      request.driverContext = null;
      return;
    }
    const unsigned = request.unsignCookie(rawCookie);
    if (!unsigned.valid || !unsigned.value) {
      request.driverContext = null;
      return;
    }
    request.driverContext = await resolveDriverSession(unsigned.value);
  });
});

export async function requireDriver(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.driverContext) {
    throw new UnauthorizedError();
  }
}

function readDriverToken(request: FastifyRequest): string | null {
  const rawCookie = request.cookies[env.DRIVER_COOKIE_NAME];
  if (!rawCookie) return null;
  const unsigned = request.unsignCookie(rawCookie);
  return unsigned.valid && unsigned.value ? unsigned.value : null;
}

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

  app.post(
    "/public/deliveries/received",
    { config: { rateLimit: { max: 20, timeWindow: "10 minutes" } } },
    async (request) => {
      const input = deliveryReceivedSchema.parse(request.body);
      return confirmReceived(input);
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

  // --- Portal del repartidor (/r). Sesión propia, separada del staff/cliente. ---

  app.post(
    "/public/drivers/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = driverLoginSchema.parse(request.body);
      const { token, expiresAt, driver } = await loginDriver(input);
      setDriverCookie(reply, token, expiresAt);
      return { driver };
    },
  );

  app.get("/public/drivers/me", { preHandler: requireDriver }, async (request) => {
    const context = request.driverContext!;
    return {
      driver: {
        id: context.driverId,
        name: context.name,
        phone: context.phone,
        organizationId: context.organizationId,
        organizationName: context.organizationName,
      },
    };
  });

  app.get("/public/drivers/me/deliveries", { preHandler: requireDriver }, async (request) => {
    const items = await listDriverDeliveries(
      request.driverContext!.organizationId,
      request.driverContext!.driverId,
    );
    return { items };
  });

  app.post("/public/drivers/logout", async (request, reply) => {
    const token = readDriverToken(request);
    if (token) await deleteDriverSession(token);
    clearDriverCookie(reply);
    return { success: true };
  });
}
