import "fastify";
import type { AuthContext } from "../shared/auth-context.js";
import type { CustomerContext } from "../shared/customer-context.js";

declare module "fastify" {
  interface FastifyRequest {
    authContext: AuthContext | null;
    /** Cliente final del menú digital. Independiente de `authContext`: nunca se llenan los dos. */
    customerContext: CustomerContext | null;
  }
}
