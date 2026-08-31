import { defineConfig } from "vitest/config";

/**
 * Tests del monorepo. Vite resuelve las extensiones `.js` de los imports de
 * TypeScript hacia sus fuentes `.ts` (los paquetes usan `NodeNext`, que exige
 * escribir `.js`), así que los tests importan del código fuente, no de dist.
 */
export default defineConfig({
  test: {
    include: [
      "packages/*/src/**/*.test.ts",
      "apps/api/src/**/*.test.ts",
      "apps/web-corte/lib/**/*.test.ts",
    ],
    environment: "node",
  },
});
