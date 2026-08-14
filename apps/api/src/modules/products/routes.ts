import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { categoryCreateSchema, productCreateSchema, productUpdateSchema } from "@pilotspos/validation";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import {
  createProduct,
  deactivateProduct,
  getProductByBarcode,
  getProductById,
  listProducts,
  updateProduct,
} from "./service.js";
import { createCategory, listCategories } from "./categories.service.js";

const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  onlyActive: z.coerce.boolean().optional(),
});

export async function registerProductRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/products", async (request) => {
    const query = listQuerySchema.parse(request.query);
    return listProducts(request.authContext!.organizationId, query);
  });

  app.get("/products/barcode/:barcode", async (request) => {
    const { barcode } = request.params as { barcode: string };
    const product = await getProductByBarcode(request.authContext!.organizationId, barcode);
    return { product };
  });

  app.get<{ Params: { id: string } }>("/products/:id", async (request) => {
    const product = await getProductById(request.authContext!.organizationId, request.params.id);
    return { product };
  });

  app.post(
    "/products",
    { preHandler: requirePermission("products.manage") },
    async (request, reply) => {
      const input = productCreateSchema.parse(request.body);
      const product = await createProduct(
        {
          organizationId: request.authContext!.organizationId,
          branchId: request.authContext!.branchId,
          userId: request.authContext!.userId,
        },
        input,
      );
      reply.status(201);
      return { product };
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/products/:id",
    { preHandler: requirePermission("products.manage") },
    async (request) => {
      const input = productUpdateSchema.parse(request.body);
      const product = await updateProduct(request.authContext!.organizationId, request.params.id, input);
      return { product };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/products/:id",
    { preHandler: requirePermission("products.delete") },
    async (request) => {
      const product = await deactivateProduct(request.authContext!.organizationId, request.params.id);
      return { product };
    },
  );

  app.get("/categories", async (request) => {
    const categories = await listCategories(request.authContext!.organizationId);
    return { categories };
  });

  app.post(
    "/categories",
    { preHandler: requirePermission("products.manage") },
    async (request, reply) => {
      const input = categoryCreateSchema.parse(request.body);
      const category = await createCategory(request.authContext!.organizationId, input);
      reply.status(201);
      return { category };
    },
  );
}
