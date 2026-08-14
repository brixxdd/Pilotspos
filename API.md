# API — PilotsPOS

Base URL en desarrollo: `http://localhost:3001` (o `/api/*` a través del proxy de Next.js en `http://localhost:3000/api/*`).

Todas las rutas privadas requieren la cookie de sesión (`pilotspos_session`, HTTP-only). El cliente HTTP del frontend (`apps/web/lib/api-client.ts`) siempre envía `credentials: "include"`.

Formato de error uniforme:

```json
{ "error": { "message": "...", "code": "SOME_CODE", "details": {} } }
```

## Auth (`apps/api/src/modules/auth`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/auth/bootstrap` | pública | Organizaciones activas + sus sucursales, para armar el login |
| POST | `/auth/login` | pública (rate-limited 10/min) | `{ organizationSlug, username, password, branchId? }` → crea sesión, setea cookie |
| GET | `/auth/me` | sesión | Usuario actual |
| POST | `/auth/logout` | sesión | Invalida la sesión y limpia la cookie |

## Usuarios (`modules/users`) — solo ADMIN

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/users` | Lista usuarios de la organización (sin `password_hash`) |
| POST | `/users` | Crea usuario |
| PATCH | `/users/:id` | Edita nombre/rol/sucursal/estado/contraseña |
| DELETE | `/users/:id` | Desactiva (no borra) — no puedes desactivarte a ti mismo |

## Productos (`modules/products`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/products` | sesión | Lista con búsqueda (`?search=`, nombre/SKU/barcode) y paginación |
| GET | `/products/:id` | sesión | Detalle con categoría y códigos de barras |
| GET | `/products/barcode/:barcode` | sesión | Lookup exacto — usado por el escáner del POS |
| POST | `/products` | `products.manage` (ADMIN/MANAGER) | Crea producto + códigos de barras; si `stock > 0` registra `INITIAL_STOCK` |
| PATCH | `/products/:id` | `products.manage` | Edita; si se envía `barcodes`, reemplaza el set completo |
| DELETE | `/products/:id` | `products.delete` (ADMIN) | Desactiva |
| GET | `/categories` | sesión | Lista categorías |
| POST | `/categories` | `products.manage` | Crea categoría |

## Inventario (`modules/inventory`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/inventory` | sesión | Stock actual (`?onlyLowStock=true` filtra stock ≤ mínimo) |
| GET | `/inventory/movements` | sesión | Historial (`?productId=`) |
| POST | `/inventory/receive` | `inventory.manage` | Recepción por lote: `{ items: [{productId, quantity}], reference?, note? }` |
| POST | `/inventory/adjust` | `inventory.adjust` | Ajuste manual: `{ productId, quantity (+/-), note? }`. Rechaza si deja stock negativo |

## Caja (`modules/cash`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/cash/registers` | Cajas de tu sucursal |
| GET | `/cash/session` | Tu sesión de caja abierta (o `null`) + resumen calculado en vivo |
| POST | `/cash/open` | `{ registerId, openingAmount }` — 409 si la caja ya tiene sesión abierta |
| POST | `/cash/movement` | `{ type: WITHDRAWAL\|DEPOSIT\|ADJUSTMENT, amount, note? }` sobre tu sesión abierta |
| POST | `/cash/close` | `{ countedCash, note? }` — exige `note` si hay diferencia con lo esperado |

## Ventas (`modules/sales`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| POST | `/sales` | `sales.create` | Checkout completo (ver `ARCHITECTURE.md` — transacción). Requiere caja abierta |
| GET | `/sales` | sesión | Lista paginada |
| GET | `/sales/:id` | sesión | Detalle con items y pagos (para el ticket) |
| POST | `/sales/:id/cancel` | `sales.cancel` (ADMIN/MANAGER) | Revierte stock, registra `RETURN`/`REFUND` |
| POST | `/sales/suspend` | `sales.create` | Guarda el carrito actual como venta suspendida |
| GET | `/sales/suspended` | sesión | Ventas suspendidas de tu sucursal |
| POST | `/sales/suspended/:id/recover` | `sales.create` | Devuelve el carrito (con precios/stock re-validados) y elimina el registro suspendido |
| DELETE | `/sales/suspended/:id` | `sales.create` | Descarta una venta suspendida sin recuperarla |

## Reportes (`modules/reports`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/reports/dashboard` | sesión (cualquier rol) | KPIs de hoy, ventas recientes, stock bajo, cajas abiertas |
| GET | `/reports/sales` | `reports.view` (ADMIN/MANAGER) | `?from=&to=` — total, ticket promedio, por día, por método de pago |
| GET | `/reports/top-products` | `reports.view` | `?from=&to=&limit=` — productos más vendidos |
| GET | `/reports/cashiers` | `reports.view` | Ventas agrupadas por cajero |
| GET | `/reports/cash` | `reports.view` | Historial de cortes de caja cerrados |

## Permisos

La matriz completa vive en `packages/domain/src/sales.ts#ROLE_PERMISSIONS` (única fuente de verdad, usada tanto por `requirePermission()` en la API como por la UI para ocultar acciones que el usuario no puede ejecutar — pero la UI nunca es la barrera real, solo cosmética).
