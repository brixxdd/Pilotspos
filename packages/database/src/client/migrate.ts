import "../env.js";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL no está definida. Revisa tu archivo .env.");
}

const migrationClient = postgres(url, { max: 1 });

async function run() {
  console.log("Aplicando migraciones...");
  await migrate(drizzle(migrationClient), { migrationsFolder: "./drizzle" });
  console.log("Migraciones aplicadas correctamente.");
  await migrationClient.end();
}

run().catch((error) => {
  console.error("Error aplicando migraciones:", error);
  process.exit(1);
});
