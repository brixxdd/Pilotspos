# PilotsPOS

Punto de venta, inventario y gestión de caja para tiendas, minisúpers, abarrotes y comercios pequeños/medianos. Producto SaaS de **DevPilots**.

## Stack

- **Web**: Next.js 14 (App Router) + React 18.3.1 + TypeScript + Tailwind CSS
- **API**: Node.js + Fastify + TypeScript
- **Base de datos**: PostgreSQL + Drizzle ORM
- **Arquitectura**: Monorepo (npm workspaces) — Web SaaS + API + paquetes compartidos

## Estructura

```text
pilotspos/
├── apps/
│   ├── web/     Next.js — interfaz de usuario
│   └── api/     Fastify — API de negocio
├── packages/
│   ├── types/       Tipos compartidos
│   ├── validation/  Esquemas Zod
│   ├── domain/       Reglas de negocio puras (sin dependencias de framework)
│   ├── database/     Schema Drizzle, migraciones, seed, cliente de conexión
│   └── ui/            Componentes React compartidos
```

Toda comunicación con datos de negocio pasa por la API (Fastify). El frontend **nunca** se conecta directamente a PostgreSQL.

## Requisitos

- Node.js 20+
- Docker (para PostgreSQL en desarrollo)

## Puesta en marcha (desarrollo)

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Levantar PostgreSQL
docker compose up -d postgres

# 4. Generar y aplicar migraciones
npm run db:generate
npm run db:migrate

# 5. Sembrar datos de desarrollo
npm run db:seed

# 6. Levantar la API (puerto 3001 por defecto)
npm run dev:api

# 7. En otra terminal, levantar el frontend (puerto 3000)
npm run dev:web
```

La web consume la API a través del proxy `/api/*` configurado en `apps/web/next.config.mjs` (ver `API_URL` en `.env`).

> Si el puerto 3001 ya está en uso en tu máquina, cambia `API_PORT` en `.env` y `API_URL` correspondientemente.

### Credenciales de desarrollo (seed)

| Usuario    | Contraseña   | Rol     |
|------------|--------------|---------|
| `admin`    | `Admin123!`  | ADMIN   |
| `cajero01` | `Cajero123!` | CASHIER |

Organización: **Mini Súper San José** · Sucursal: **Centro** · Cajas: **Caja 01 / Caja 02**

**Nunca uses estas credenciales en producción.**

## Scripts principales

```bash
npm run dev:web        # Next.js en modo desarrollo
npm run dev:api        # Fastify en modo desarrollo (watch)
npm run build           # Build de producción de todos los workspaces
npm run lint             # ESLint en todos los workspaces
npm run typecheck        # Verificación de tipos en todos los workspaces
npm run db:generate      # Generar migraciones desde el schema Drizzle
npm run db:migrate       # Aplicar migraciones a PostgreSQL
npm run db:seed          # Sembrar datos de desarrollo
npm run db:studio        # Drizzle Studio (explorador visual de la BD)
```

## Estado del proyecto

Este proyecto se está reconstruyendo por fases. Estado actual:

- [x] Fase 1 — Fundación (monorepo, Next.js, Fastify, PostgreSQL, Drizzle, Docker, packages, ESLint, Git)
- [ ] Fase 2 — Autenticación (organizaciones, sucursales, usuarios, roles, sesiones)
- [ ] Fase 3 — Productos (categorías, códigos de barras, búsqueda)
- [ ] Fase 4 — Inventario
- [ ] Fase 5 — Caja
- [ ] Fase 6 — POS / Ventas
- [ ] Fase 7 — Reportes y Dashboard
- [ ] Fase 8 — UX (estados de carga, vacíos, errores, responsive)
- [ ] Fase 9 — Producción (build, seguridad, despliegue)

Ver `ARCHITECTURE.md`, `DATABASE.md`, `API.md` y `DEVELOPMENT.md` para más detalle (se completan en la Fase 9).

## Seguridad

- Sesiones server-side con cookies HTTP-only (no se usa `localStorage` para nada sensible).
- Contraseñas con bcrypt.
- Aislamiento estricto por `organizationId`, determinado siempre desde la sesión — nunca desde el cliente.
- Ver notas de seguridad conocidas en `DEVELOPMENT.md` (Fase 9) respecto a las versiones fijadas de Next.js/React.
