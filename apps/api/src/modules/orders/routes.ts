import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { menuOrderCreateSchema, menuOrderUpdateSchema } from "@pilotspos/validation";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { requireCustomer } from "../customers/routes.js";
import { createMenuOrder, listOrders, updateOrderStatus } from "./service.js";

const slug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, "Slug inválido");

const orderParamsSchema = z.object({ orgSlug: slug, branchSlug: slug });
const orderIdParamsSchema = z.object({ id: z.string().uuid() });

const listQuerySchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

/**
 * Pedidos del menú digital. Dos caras:
 * - La pública crea pedidos y exige SESIÓN DE CLIENTE (`requireCustomer`) —
 *   los renglones y el crédito se validan en el servidor contra el catálogo.
 * - Las de personal (listar/resolver) exigen sesión de personal con permisos.
 */
export async function registerOrderRoutes(app: FastifyInstance) {
  app.post<{ Params: { orgSlug: string; branchSlug: string } }>(
    "/public/menu/:orgSlug/:branchSlug/orders",
    {
      preHandler: requireCustomer,
      config: { rateLimit: { max: 30, timeWindow: "10 minutes" } },
    },
    async (request, reply) => {
      const params = orderParamsSchema.parse(request.params);
      const input = menuOrderCreateSchema.parse(request.body);
      const order = await createMenuOrder({
        orgSlug: params.orgSlug,
        branchSlug: params.branchSlug,
        customer: request.customerContext!,
        input,
      });
      reply.status(201);
      return { order };
    },
  );

  app.get(
    "/orders",
    { preHandler: [requireAuth, requirePermission("orders.view")] },
    async (request) => {
      const query = listQuerySchema.parse(request.query);
      return listOrders(request.authContext!.organizationId, query);
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/orders/:id",
    { preHandler: [requireAuth, requirePermission("orders.manage")] },
    async (request) => {
      const { id } = orderIdParamsSchema.parse(request.params);
      const input = menuOrderUpdateSchema.parse(request.body);
      const order = await updateOrderStatus(
        { organizationId: request.authContext!.organizationId, id, userId: request.authContext!.userId },
        input,
      );
      return { order };
    },
  );
}
