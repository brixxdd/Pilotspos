import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import sensible from "@fastify/sensible";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { corsOrigins, env } from "../config/env.js";

export async function registerSecurityPlugins(app: FastifyInstance) {
  await app.register(sensible);

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });

  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
    hook: "onRequest",
  });

  // Límite general razonable para toda la API.
  await app.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
  });
}
