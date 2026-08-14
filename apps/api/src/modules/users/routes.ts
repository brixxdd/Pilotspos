import type { FastifyInstance } from "fastify";
import { userCreateSchema, userUpdateSchema } from "@pilotspos/validation";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { AppError } from "../../shared/errors.js";
import { createUser, deactivateUser, listUsers, updateUser } from "./service.js";

export async function registerUserRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("ADMIN"));

  app.get("/users", async (request) => {
    const users = await listUsers(request.authContext!.organizationId);
    return { users };
  });

  app.post("/users", async (request, reply) => {
    const input = userCreateSchema.parse(request.body);
    const user = await createUser(request.authContext!.organizationId, input);
    reply.status(201);
    return { user };
  });

  app.patch<{ Params: { id: string } }>("/users/:id", async (request) => {
    const input = userUpdateSchema.parse(request.body);
    const user = await updateUser(request.authContext!.organizationId, request.params.id, input);
    return { user };
  });

  app.delete<{ Params: { id: string } }>("/users/:id", async (request) => {
    if (request.params.id === request.authContext!.userId) {
      throw new AppError("No puedes desactivar tu propio usuario", 400, "SELF_DEACTIVATION");
    }
    const user = await deactivateUser(request.authContext!.organizationId, request.params.id);
    return { user };
  });
}
