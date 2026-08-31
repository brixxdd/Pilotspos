import "fastify";
import type { AuthContext } from "../shared/auth-context.js";
import type { CustomerContext } from "../shared/customer-context.js";
import type { DriverContext } from "../shared/driver-context.js";

declare module "fastify" {
  interface FastifyRequest {
    authContext: AuthContext | null;
    /** Cliente final del menú digital. Independiente de `authContext`: nunca se llenan los dos. */
    customerContext: CustomerContext | null;
    /** Repartidor en su portal (/r). Tercer universo, separado de staff y cliente. */
    driverContext: DriverContext | null;
  }
}
