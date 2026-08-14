import type { FastifyInstance } from "fastify";
import { loginSchema } from "@pilotspos/validation";
import type { SessionUser } from "@pilotspos/types";
import { getBootstrap, login } from "./service.js";
import { deleteSession } from "./session.service.js";
import { clearSessionCookie, setSessionCookie } from "./cookie.js";
import { requireAuth } from "../../middleware/auth.js";
import { env } from "../../config/env.js";

function toSessionUser(context: {
  userId: string;
  username: string;
  fullName: string;
  role: SessionUser["role"];
  organizationId: string;
  organizationName: string;
  branchId: string | null;
  branchName: string | null;
}): SessionUser {
  return {
    id: context.userId,
    username: context.username,
    fullName: context.fullName,
    role: context.role,
    organizationId: context.organizationId,
    organizationName: context.organizationName,
    branchId: context.branchId,
    branchName: context.branchName,
  };
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.get("/auth/bootstrap", async () => {
    return getBootstrap();
  });

  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = loginSchema.parse(request.body);
      const { token, expiresAt, context } = await login(input);
      setSessionCookie(reply, token, expiresAt);
      return { user: toSessionUser(context) };
    },
  );

  app.get("/auth/me", { preHandler: requireAuth }, async (request) => {
    return { user: toSessionUser(request.authContext!) };
  });

  app.post("/auth/logout", { preHandler: requireAuth }, async (request, reply) => {
    const rawCookie = request.cookies[env.SESSION_COOKIE_NAME];
    if (rawCookie) {
      const unsigned = request.unsignCookie(rawCookie);
      if (unsigned.valid && unsigned.value) {
        await deleteSession(unsigned.value);
      }
    }
    clearSessionCookie(reply);
    return { success: true };
  });
}
