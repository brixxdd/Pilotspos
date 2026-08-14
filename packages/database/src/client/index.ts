import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema/index.js";

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está definida. Revisa tu archivo .env.");
  }
  return url;
}

// Un único pool de conexiones por proceso.
const queryClient = postgres(getDatabaseUrl(), { max: 10 });

export const db = drizzle(queryClient, { schema });
export type Database = typeof db;

export { schema };
