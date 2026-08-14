import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@pilotspos/types";
import { env } from "../config/env.js";
import { resolveSession } from "../modules/auth/session.service.js";
import { ForbiddenError, UnauthorizedError } from "../shared/errors.js";

/**
 * Adjunta `request.authContext` en cada request leyendo la cookie de sesión.
 * No rechaza la request por sí solo — las rutas protegidas deben usar
 * `requireAuth` como `preHandler`.
 */
export const authContextPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest("authContext", null);

  app.addHook("onRequest", async (request: FastifyRequest) => {
    const rawCookie = request.cookies[env.SESSION_COOKIE_NAME];
    if (!rawCookie) {
      request.authContext = null;
      return;
    }

    const unsigned = request.unsignCookie(rawCookie);
    if (!unsigned.valid || !unsigned.value) {
      request.authContext = null;
      return;
    }

    request.authContext = await resolveSession(unsigned.value);
  });
});

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.authContext) {
    throw new UnauthorizedError();
  }
}

export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.authContext) {
      throw new UnauthorizedError();
    }
    if (!roles.includes(request.authContext.role)) {
      throw new ForbiddenError();
    }
  };
}
