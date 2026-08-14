import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { inventoryAdjustSchema, inventoryReceiveSchema } from "@pilotspos/validation";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../shared/errors.js";
import { adjustInventory, getInventoryOverview, listMovements, receiveInventory } from "./service.js";

function requireBranch(request: FastifyRequest): string {
  const branchId = request.authContext!.branchId;
  if (!branchId) {
    throw new AppError(
      "Tu usuario no tiene una sucursal asignada; no se puede registrar el movimiento",
      400,
      "NO_BRANCH_ASSIGNED",
    );
  }
  return branchId;
}

const overviewQuerySchema = z.object({
  search: z.string().optional(),
  onlyLowStock: z.coerce.boolean().optional(),
});

const movementsQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export async function registerInventoryRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/inventory", async (request) => {
    const query = overviewQuerySchema.parse(request.query);
    const items = await getInventoryOverview(request.authContext!.organizationId, query);
    return { items };
  });

  app.get("/inventory/movements", async (request) => {
    const query = movementsQuerySchema.parse(request.query);
    return listMovements(request.authContext!.organizationId, query);
  });

  app.post(
    "/inventory/receive",
    { preHandler: requirePermission("inventory.manage") },
    async (request) => {
      const input = inventoryReceiveSchema.parse(request.body);
      return receiveInventory(
        {
          organizationId: request.authContext!.organizationId,
          branchId: requireBranch(request),
          userId: request.authContext!.userId,
        },
        input,
      );
    },
  );

  app.post(
    "/inventory/adjust",
    { preHandler: requirePermission("inventory.adjust") },
    async (request) => {
      const input = inventoryAdjustSchema.parse(request.body);
      return adjustInventory(
        {
          organizationId: request.authContext!.organizationId,
          branchId: requireBranch(request),
          userId: request.authContext!.userId,
        },
        input,
      );
    },
  );
}
