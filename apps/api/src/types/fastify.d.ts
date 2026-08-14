import "fastify";
import type { AuthContext } from "../shared/auth-context.js";

declare module "fastify" {
  interface FastifyRequest {
    authContext: AuthContext | null;
  }
}
