import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { getCashReport, getCashiersReport, getDashboard, getSalesReport, getTopProducts } from "./service.js";

const rangeQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export async function registerReportsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/reports/dashboard", async (request) => {
    return getDashboard(request.authContext!.organizationId);
  });

  app.get(
    "/reports/sales",
    { preHandler: requirePermission("reports.view") },
    async (request) => {
      const { from, to } = rangeQuerySchema.parse(request.query);
      return getSalesReport(request.authContext!.organizationId, { from, to });
    },
  );

  app.get(
    "/reports/top-products",
    { preHandler: requirePermission("reports.view") },
    async (request) => {
      const { from, to, limit } = rangeQuerySchema.parse(request.query);
      const items = await getTopProducts(request.authContext!.organizationId, { from, to }, limit ?? 10);
      return { items };
    },
  );

  app.get(
    "/reports/products",
    { preHandler: requirePermission("reports.view") },
    async (request) => {
      const { from, to, limit } = rangeQuerySchema.parse(request.query);
      const items = await getTopProducts(request.authContext!.organizationId, { from, to }, limit ?? 10);
      return { items };
    },
  );

  app.get(
    "/reports/cashiers",
    { preHandler: requirePermission("reports.view") },
    async (request) => {
      const { from, to } = rangeQuerySchema.parse(request.query);
      const items = await getCashiersReport(request.authContext!.organizationId, { from, to });
      return { items };
    },
  );

  app.get(
    "/reports/cash",
    { preHandler: requirePermission("reports.view") },
    async (request) => {
      const { from, to } = rangeQuerySchema.parse(request.query);
      const items = await getCashReport(request.authContext!.organizationId, { from, to });
      return { items };
    },
  );
}
