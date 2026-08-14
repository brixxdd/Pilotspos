import type { FastifyInstance, FastifyRequest } from "fastify";
import { cashCloseSchema, cashMovementSchema, cashOpeningSchema } from "@pilotspos/validation";
import { requireAuth } from "../../middleware/auth.js";
import { AppError } from "../../shared/errors.js";
import { addMovement, closeSession, getOpenSession, listRegisters, openSession } from "./service.js";

function requireBranch(request: FastifyRequest): string {
  const branchId = request.authContext!.branchId;
  if (!branchId) {
    throw new AppError(
      "Tu usuario no tiene una sucursal asignada; no se puede operar la caja",
      400,
      "NO_BRANCH_ASSIGNED",
    );
  }
  return branchId;
}

export async function registerCashRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/cash/registers", async (request) => {
    const registers = await listRegisters(request.authContext!.organizationId, request.authContext!.branchId);
    return { registers };
  });

  app.get("/cash/session", async (request) => {
    const result = await getOpenSession(request.authContext!.organizationId, request.authContext!.userId);
    return { session: result?.session ?? null, summary: result?.summary ?? null };
  });

  app.post("/cash/open", async (request, reply) => {
    const input = cashOpeningSchema.parse(request.body);
    const result = await openSession(
      {
        organizationId: request.authContext!.organizationId,
        branchId: requireBranch(request),
        userId: request.authContext!.userId,
      },
      input,
    );
    reply.status(201);
    return result;
  });

  app.post("/cash/movement", async (request) => {
    const input = cashMovementSchema.parse(request.body);
    return addMovement(
      { organizationId: request.authContext!.organizationId, userId: request.authContext!.userId },
      input,
    );
  });

  app.post("/cash/close", async (request) => {
    const input = cashCloseSchema.parse(request.body);
    return closeSession(
      { organizationId: request.authContext!.organizationId, userId: request.authContext!.userId },
      input,
    );
  });
}
