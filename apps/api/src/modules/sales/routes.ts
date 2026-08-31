import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { saleSchema, suspendSaleSchema, syncSaleSchema } from "@pilotspos/validation";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { getCurrentOpenSession } from "../cash/service.js";
import {
  cancelSale,
  createSale,
  discardSuspendedSale,
  getSaleById,
  listSales,
  listSuspendedSales,
  recoverSuspendedSale,
  suspendSale,
} from "./service.js";

const listSalesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  userId: z.string().uuid().optional(),
});

export async function registerSalesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/sales", { preHandler: requirePermission("sales.create") }, async (request, reply) => {
    const input = saleSchema.parse(request.body);
    const sale = await createSale(
      {
        organizationId: request.authContext!.organizationId,
        userId: request.authContext!.userId,
        branchId: request.authContext!.branchId,
      },
      input,
    );
    reply.status(201);
    return { sale };
  });

  // Usada por la cola de sincronización offline del cliente (ver apps/web/lib/offline-queue.ts).
  // A diferencia de POST /sales: exige clientSaleId (reintentos idempotentes) y permite que el
  // stock quede negativo — la venta ya ocurrió físicamente mientras la caja estaba sin conexión,
  // así que rechazarla dejaría efectivo en caja sin una venta que lo respalde.
  app.post("/sales/sync", { preHandler: requirePermission("sales.create") }, async (request, reply) => {
    const input = syncSaleSchema.parse(request.body);
    const sale = await createSale(
      {
        organizationId: request.authContext!.organizationId,
        userId: request.authContext!.userId,
        branchId: request.authContext!.branchId,
      },
      input,
      { allowNegativeStock: true },
    );
    reply.status(201);
    return { sale };
  });

  app.get("/sales", async (request) => {
    const query = listSalesQuerySchema.parse(request.query);
    return listSales(request.authContext!.organizationId, query);
  });

  app.get<{ Params: { id: string } }>("/sales/:id", async (request) => {
    const sale = await getSaleById(request.authContext!.organizationId, request.params.id);
    return { sale };
  });

  app.post<{ Params: { id: string } }>(
    "/sales/:id/cancel",
    { preHandler: requirePermission("sales.cancel") },
    async (request) => {
      const sale = await cancelSale(
        { organizationId: request.authContext!.organizationId, userId: request.authContext!.userId },
        request.params.id,
      );
      return { sale };
    },
  );

  app.post("/sales/suspend", { preHandler: requirePermission("sales.create") }, async (request, reply) => {
    const input = suspendSaleSchema.parse(request.body);
    const session = await getCurrentOpenSession(
      request.authContext!.organizationId,
      request.authContext!.userId,
      request.authContext!.branchId,
    );
    const suspended = await suspendSale(
      {
        organizationId: request.authContext!.organizationId,
        branchId: session.branchId,
        registerId: session.registerId,
        userId: request.authContext!.userId,
      },
      input,
    );
    reply.status(201);
    return { suspended };
  });

  app.get("/sales/suspended", async (request) => {
    const items = await listSuspendedSales(
      request.authContext!.organizationId,
      request.authContext!.branchId,
    );
    return { items };
  });

  app.post<{ Params: { id: string } }>(
    "/sales/suspended/:id/recover",
    { preHandler: requirePermission("sales.create") },
    async (request) => {
      return recoverSuspendedSale(request.authContext!.organizationId, request.params.id);
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/sales/suspended/:id",
    { preHandler: requirePermission("sales.create") },
    async (request) => {
      return discardSuspendedSale(request.authContext!.organizationId, request.params.id);
    },
  );
}
