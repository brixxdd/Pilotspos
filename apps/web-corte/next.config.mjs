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
  experimental: {
    // Next 14.2 guarda en el cliente la respuesta de las páginas dinámicas
    // durante 30s. Aquí eso significa entrar a la cuenta y que el menú te
    // siga tratando como visitante, o cambiar un precio y no verlo al
    // navegar. En un punto de venta el dato de hace 30 segundos ya es viejo.
    staleTimes: { dynamic: 0 },
  },
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
