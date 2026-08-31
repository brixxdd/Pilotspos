import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

// Carga el .env de la raíz del monorepo antes que cualquier otro módulo
// (en particular antes de @pilotspos/database) para que DATABASE_URL exista.
const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es requerida"),
  COOKIE_SECRET: z.string().min(16, "COOKIE_SECRET debe tener al menos 16 caracteres"),
  SESSION_COOKIE_NAME: z.string().default("pilotspos_session"),
  CUSTOMER_COOKIE_NAME: z.string().default("pilotspos_customer"),
  DRIVER_COOKIE_NAME: z.string().default("pilotspos_driver"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  /**
   * Confiar en los encabezados de proxy para deducir la IP del cliente.
   * En producción va detrás de Nginx + Cloudflare; sin esto Fastify ve una
   * sola IP para todo el mundo y el rate limiting castiga a todos juntos.
   * Solo se activa donde el contenedor está publicado en 127.0.0.1 y la
   * única entrada posible es el reverse proxy — si no, cualquiera podría
   * falsificar X-Forwarded-For y saltarse los límites.
   */
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variables de entorno inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
