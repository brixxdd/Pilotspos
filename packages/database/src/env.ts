// Carga el .env de la raíz del monorepo para scripts ejecutados directamente
// dentro de este paquete (migrate, seed). Las apps (apps/api) cargan su propio
// .env antes de importar @pilotspos/database, por lo que no dependen de esto.
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(here, "../../../.env");

config({ path: rootEnvPath });
