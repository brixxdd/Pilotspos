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

# 3. Compilar los paquetes compartidos (types, validation, domain, database, ui)
#    Requerido: apps/api y apps/web consumen su dist/, no su código fuente.
#    Vuelve a ejecutarse cada vez que cambies algo dentro de packages/*.
npm run build:packages

# 4. Levantar PostgreSQL
docker compose up -d postgres

# 5. Generar y aplicar migraciones
npm run db:generate
npm run db:migrate

# 6. Sembrar datos de desarrollo
npm run db:seed

# 7. Levantar la API (puerto 3001 por defecto)
npm run dev:api

# 8. En otra terminal, levantar el frontend (puerto 3000)
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
- [x] Fase 2 — Autenticación (organizaciones, sucursales, usuarios, roles, sesiones server-side, login real, CRUD de usuarios)
- [x] Fase 3 — Productos (categorías, códigos de barras múltiples, búsqueda por nombre/SKU/barcode, alta con escaneo)
- [x] Fase 4 — Inventario (recepción por escaneo, ajustes, stock bajo, historial de movimientos)
- [x] Fase 5 — Caja (apertura, retiros/entradas, corte con efectivo esperado/contado/diferencia, cierre)
- [x] Fase 6 — POS / Ventas (carrito con escáner, pagos efectivo/tarjeta/transferencia/mixto, transacción atómica, ticket imprimible, suspender/recuperar, cancelación)
- [x] Fase 7 — Reportes y Dashboard (KPIs del día, ventas por fecha/método/cajero, top productos, cortes de caja)
- [x] Fase 8 — UX (loading states, error boundaries, banner offline, sidebar responsive, Configuración)
- [x] Fase 9 — Producción (documentación completa, checklist de seguridad, guía de build/deploy)

Documentación adicional: [`ARCHITECTURE.md`](./ARCHITECTURE.md) (arquitectura y decisiones), [`DATABASE.md`](./DATABASE.md) (schema y migraciones), [`API.md`](./API.md) (referencia de endpoints), [`DEVELOPMENT.md`](./DEVELOPMENT.md) (setup, variables de entorno, checklist de seguridad, guía de producción).

## Seguridad

- Sesiones server-side con cookies HTTP-only (no se usa `localStorage` para nada sensible).
- Contraseñas con bcrypt.
- Aislamiento estricto por `organizationId`, determinado siempre desde la sesión — nunca desde el cliente.
- Ver notas de seguridad conocidas en `DEVELOPMENT.md` (Fase 9) respecto a las versiones fijadas de Next.js/React.
