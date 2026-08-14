# Arquitectura — PilotsPOS

## Visión general

```text
Next.js (apps/web)
      │  fetch a /api/* (rewrite de Next)
      ▼
Fastify (apps/api)
      │  Drizzle ORM
      ▼
PostgreSQL
```

El frontend **nunca** habla directamente con PostgreSQL. Toda operación de negocio pasa por la API de Fastify, que es la única que conoce `DATABASE_URL`.

No hay microservicios, colas, cachés externas ni un orquestador. Es intencional: el tamaño del problema (POS para comercios pequeños/medianos) no lo justifica. Ver la sección "Reglas contra sobreingeniería" del documento de reconstrucción original.

## Monorepo

```text
pilotspos/
├── apps/
│   ├── web/     Next.js 14 (App Router) + React 18.3.1 — UI
│   └── api/     Fastify — API de negocio
└── packages/
    ├── types/       Tipos TS compartidos (contrato API ⇄ Web)
    ├── validation/  Esquemas Zod (mismo esquema valida cliente y servidor)
    ├── domain/       Reglas de negocio puras (sin React/Fastify/Node)
    ├── database/     Schema Drizzle, migraciones, seed, cliente de conexión
    └── ui/            Componentes React compartidos
```

### Por qué existe cada paquete

- **`@pilotspos/types`**: evita que API y Web diverjan sobre la forma de una `Sale`, un `Product`, etc.
- **`@pilotspos/validation`**: un único `productCreateSchema` valida el formulario en el navegador (`react-hook-form` + `zodResolver`) y el body del `POST /products` en la API. No hay dos copias de la misma regla.
- **`@pilotspos/domain`**: funciones puras (`calculateSubtotal`, `calculateExpectedCash`, `canPerformAction`, etc.) que no importan React ni Fastify. Se usan **desde ambos lados**: la API las usa para calcular totales/autorizar dentro de una transacción; la Web las usa para mostrar el cambio y el total en vivo mientras el cajero cobra, sin esperar un roundtrip al servidor. Es la misma lógica en ambos lugares porque es el mismo código.
- **`@pilotspos/database`**: única fuente de verdad del schema. `apps/api` es el único consumidor en tiempo de ejecución.
- **`@pilotspos/ui`**: componentes de presentación (`Button`, `Table`, `Modal`, `DataTable`...) sin lógica de negocio.

### Paquetes compilados, no fuente

Cada paquete en `packages/*` compila a `dist/` (`npm run build:packages`) y su `package.json` apunta `main`/`types` ahí, no a `src/`. Esto es necesario porque:

- `apps/api` corre en Node con resolución de módulos `NodeNext`, que requiere JavaScript real (no puede ejecutar `.ts` directamente en producción).
- `apps/web` (Next.js/webpack) sí puede procesar TypeScript, pero al consumir JS ya compilado desde `node_modules` no necesita tratamiento especial (`transpilePackages`) ni arrastra el conflicto de resolución de módulos entre bundler y Node.

En desarrollo, `npm run dev:api` (tsx) y `npm run dev:web` (next dev) siguen funcionando con recarga rápida, pero dependen de que `dist/` exista. Por eso `npm run build:packages` es un paso obligatorio la primera vez (ver `DEVELOPMENT.md`).

## Multi-tenancy

```text
Organization
    │
    ├── Branch
    │      ├── Register
    │      └── Users
    │
    ├── Products, Categories, Suppliers
    ├── Sales, SaleItems, Payments, SuspendedSales
    ├── InventoryMovements
    └── CashSessions, CashMovements
```

Casi toda tabla de negocio tiene `organization_id`. El backend **nunca** confía en un `organizationId`/`branchId`/`userId`/`role` enviado por el cliente: todo sale de la sesión autenticada (`request.authContext`, resuelto desde la cookie de sesión). Ver `apps/api/src/middleware/auth.ts`.

## Autenticación y autorización

- Sesiones **server-side**: la cookie del navegador solo contiene un token opaco firmado; el servidor guarda el hash SHA-256 del token en la tabla `sessions` (nunca el token en claro). `apps/api/src/modules/auth/session.service.ts`.
- Cada módulo de rutas se registra con `app.register(...)`, lo que crea un contexto de encapsulación de Fastify: los hooks (`requireAuth`, `requireRole`, `requirePermission`) que un módulo agrega **no se filtran** a otros módulos.
- La autorización por rol vive en un único lugar: `@pilotspos/domain#canPerformAction` (matriz rol → permiso). La API la aplica vía `requirePermission(...)`; nunca se decide autorización solo ocultando botones en el frontend.

## La venta como transacción

```text
POST /sales
  │
  ├─ deriva branchId/registerId de la sesión de caja ABIERTA del cajero
  │  (nunca del body — evita vender contra una caja que no es la tuya)
  ├─ valida carrito (stock suficiente, cantidades) — @pilotspos/domain#validateCart
  ├─ valida que la suma de pagos == total (en centavos, sin errores de punto flotante)
  └─ transacción PostgreSQL (Drizzle db.transaction):
       insert sale
       insert sale_items (snapshot de nombre/precio — no se ve afectada por ediciones futuras del producto)
       update products.stock (con guardia WHERE stock >= cantidad)
       insert inventory_movements (type=SALE)
       insert payments
       insert cash_movements (type=SALE) solo para el monto pagado en efectivo
```

Si cualquier paso falla, la transacción completa se revierte — nunca queda una venta a medias con stock sin descontar.

## Navegación sin pantallas blancas

`apps/web/app/(app)/layout.tsx` monta `Sidebar` + `Header` una sola vez para todo el grupo de rutas autenticadas. Al navegar entre `/sales`, `/products`, `/inventory`, etc., React seguirá reconciliando ese layout persistente — no se desmonta ni remonta. Cada ruta añade su propio `loading.tsx` (Next App Router) para mostrar un estado de carga local en vez de una pantalla en blanco mientras el Server Component obtiene datos.
