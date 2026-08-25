import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { listBranches } from "./service.js";

export async function registerBranchRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Sin permiso especial: cualquier sesión válida necesita poder nombrar sus
  // sucursales (selector de usuarios, encabezados, reportes).
  app.get("/branches", async (request) => {
    const branches = await listBranches(request.authContext!.organizationId);
    return { branches };
  });
}
