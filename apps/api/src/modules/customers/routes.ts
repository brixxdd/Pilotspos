import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  customerCreditUpdateSchema,
  customerListQuerySchema,
  customerLoginSchema,
  customerProfileUpdateSchema,
  customerRegisterSchema,
} from "@pilotspos/validation";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../shared/errors.js";
import { clearCustomerCookie, setCustomerCookie } from "./cookie.js";
import { deleteCustomerSession, resolveCustomerSession } from "./session.service.js";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import {
  getCustomerDetail,
  listCustomers,
  loginCustomer,
  registerCustomer,
  toSessionCustomer,
  updateCustomerCredit,
  updateCustomerProfile,
} from "./service.js";

/**
 * Adjunta `request.customerContext` leyendo la cookie de cliente. Igual que
 * `authContextPlugin`, no rechaza nada por sí solo.
 */
export const customerContextPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest("customerContext", null);

  app.addHook("onRequest", async (request: FastifyRequest) => {
    const rawCookie = request.cookies[env.CUSTOMER_COOKIE_NAME];
    if (!rawCookie) {
      request.customerContext = null;
      return;
    }

    const unsigned = request.unsignCookie(rawCookie);
    if (!unsigned.valid || !unsigned.value) {
      request.customerContext = null;
      return;
    }

    request.customerContext = await resolveCustomerSession(unsigned.value);
  });
});

export async function requireCustomer(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.customerContext) {
    throw new UnauthorizedError();
  }
}

function readCustomerToken(request: FastifyRequest): string | null {
  const rawCookie = request.cookies[env.CUSTOMER_COOKIE_NAME];
  if (!rawCookie) return null;
  const unsigned = request.unsignCookie(rawCookie);
  return unsigned.valid && unsigned.value ? unsigned.value : null;
}

/**
 * Cuentas de cliente final. Rutas públicas por definición: cualquiera que
 * escanee el QR puede registrarse. Van con límite de intentos porque son la
 * única superficie de la API abierta a internet sin sesión previa.
 */
export async function registerCustomerRoutes(app: FastifyInstance) {
  app.post(
    "/customers/register",
    { config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const input = customerRegisterSchema.parse(request.body);
      const { token, expiresAt, context } = await registerCustomer(input);
      setCustomerCookie(reply, token, expiresAt);
      reply.status(201);
      return { customer: toSessionCustomer(context) };
    },
  );

  app.post(
    "/customers/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = customerLoginSchema.parse(request.body);
      const { token, expiresAt, context } = await loginCustomer(input);
      setCustomerCookie(reply, token, expiresAt);
      return { customer: toSessionCustomer(context) };
    },
  );

  app.get("/customers/me", { preHandler: requireCustomer }, async (request) => {
    return { customer: toSessionCustomer(request.customerContext!) };
  });

  app.patch("/customers/me", { preHandler: requireCustomer }, async (request) => {
    const input = customerProfileUpdateSchema.parse(request.body);
    const customer = await updateCustomerProfile(request.customerContext!.customerId, input);
    return { customer };
  });

  app.post("/customers/logout", async (request, reply) => {
    const token = readCustomerToken(request);
    if (token) await deleteCustomerSession(token);
    clearCustomerCookie(reply);
    return { success: true };
  });
}

/**
 * Rutas de clientes que solo ve el personal (mostrador y panel). Viven en el
 * mismo módulo que las públicas pero exigen sesión de personal — un cliente
 * final jamás puede pasar `requireAuth` porque su contexto no tiene `role`.
 * El aislamiento por organización sale siempre de la sesión, nunca del body.
 */
export async function registerStaffCustomerRoutes(app: FastifyInstance) {
  app.get(
    "/customers",
    { preHandler: [requireAuth, requirePermission("customers.view")] },
    async (request) => {
      const query = customerListQuerySchema.parse(request.query);
      const page = await listCustomers(request.authContext!.organizationId, query);
      return page;
    },
  );

  app.get<{ Params: { id: string } }>(
    "/customers/:id",
    { preHandler: [requireAuth, requirePermission("customers.view")] },
    async (request) => {
      const customer = await getCustomerDetail(request.authContext!.organizationId, request.params.id);
      return { customer };
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/customers/:id/credit",
    { preHandler: [requireAuth, requirePermission("customers.manage")] },
    async (request) => {
      const input = customerCreditUpdateSchema.parse(request.body);
      const customer = await updateCustomerCredit(
        request.authContext!.organizationId,
        request.params.id,
        input,
      );
      return { customer };
    },
  );
}
