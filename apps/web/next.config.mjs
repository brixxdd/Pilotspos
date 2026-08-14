import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Next.js solo carga .env dentro de apps/web/ por defecto. El .env real del
// proyecto vive en la raíz del monorepo, así que lo cargamos explícitamente
// aquí — esto corre una sola vez al iniciar el servidor de Next (dev o
// start) y deja las variables disponibles en todo el proceso, incluyendo
// los Server Components que leen process.env.API_URL en tiempo de request.
config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env") });

const apiUrl = process.env.API_URL ?? "http://localhost:3001";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
