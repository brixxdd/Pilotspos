# Base de datos — PilotsPOS

PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/). Schema definido en `packages/database/src/schema/*.ts`.

## Tablas

| Tabla | Propósito | Notas |
|---|---|---|
| `organizations` | Empresa (tenant) | `slug` único, usado en el login |
| `branches` | Sucursal | `unique(organization_id, slug)` |
| `registers` | Caja física | Pertenece a una sucursal |
| `users` | Usuarios | `unique(organization_id, username)`, `password_hash` con bcrypt, rol enum (`ADMIN`/`MANAGER`/`CASHIER`) |
| `sessions` | Sesiones server-side | `id` = hash SHA-256 del token de la cookie, `expires_at` |
| `categories`, `suppliers` | Catálogo de apoyo | Por organización |
| `products` | Productos | `unique(organization_id, sku)`, `stock` y `minimum_stock` a nivel organización (no por sucursal en este MVP) |
| `product_barcodes` | Códigos de barras | Un producto puede tener **varios** códigos (presentaciones distintas del mismo producto) |
| `inventory_movements` | Auditoría de stock | `type`: `SALE`, `PURCHASE`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `RETURN`, `INITIAL_STOCK`. Toda modificación de `products.stock` pasa por aquí |
| `cash_sessions` | Turno de caja | Un `register` solo puede tener una sesión `OPEN` a la vez |
| `cash_movements` | Movimientos de caja | `type`: `OPENING`, `SALE`, `WITHDRAWAL`, `DEPOSIT`, `REFUND`, `ADJUSTMENT` |
| `sales` | Venta | `sale_number` único por organización (`V-00001`, ...), `cash_session_id` |
| `sale_items` | Líneas de venta | Snapshot de `product_name`/`unit_price` en el momento de la venta |
| `payments` | Pagos de una venta | `method`: `CASH`, `CARD`, `TRANSFER`, `MIXED`; `received_amount`/`change_amount` solo para efectivo |
| `suspended_sales` | Ventas suspendidas | Carrito completo como `jsonb` en `items` |

## Decisiones de diseño

- **Stock a nivel organización, no por sucursal.** El schema original (sección 9 del documento de reconstrucción) define un único campo `stock` por producto. `inventory_movements` sí registra `branch_id` para auditoría de *dónde* ocurrió el movimiento, pero el número de stock es global a la organización. Si el negocio crece a múltiples sucursales con inventarios separados, este es el primer punto a evolucionar (tabla `product_stock_by_branch`).
- **Baja = desactivar, no `DELETE`.** `products.active` y `users.active` en vez de borrado físico. Un producto o usuario puede estar referenciado por ventas históricas (`sale_items.product_id`, `sales.user_id`); borrarlo rompería esos registros o forzaría `ON DELETE CASCADE` sobre datos que deben conservarse.
- **`sale_items` guarda una copia del nombre y precio.** Si mañana cambias el precio de "Coca-Cola 600ml", los tickets de ventas pasadas deben seguir mostrando el precio al que realmente se vendió.
- **Sesiones hasheadas.** `sessions.id` no es el token que ve el navegador — es su hash SHA-256. Si la base de datos se filtrara, los tokens de sesión no serían directamente utilizables.

## Índices

Además de las llaves primarias/foráneas, hay índices explícitos en:

```text
organization_id      (casi todas las tablas — es el filtro más común)
branch_id             (registers, inventory_movements, sales, suspended_sales)
product_barcodes.barcode   (búsqueda del escáner, debe ser O(1))
products (organization_id, sku)  — único
sales (organization_id, sale_number) — único
created_at            (inventory_movements, cash_movements, sales — reportes por fecha)
sessions.expires_at   (para poder limpiar sesiones vencidas)
```

## Migraciones

```bash
# Después de modificar packages/database/src/schema/*.ts:
npm run db:generate    # genera el SQL en packages/database/drizzle/
npm run db:migrate     # lo aplica contra DATABASE_URL

# Explorar la base visualmente:
npm run db:studio
```

Las migraciones generadas (`packages/database/drizzle/*.sql`) se versionan en Git — son parte del historial del schema, no un artefacto de build.

## Seed de desarrollo

```bash
npm run db:seed
```

Crea la organización **Mini Súper San José**, sucursal **Centro**, cajas **Caja 01**/**Caja 02**, usuarios `admin`/`Admin123!` y `cajero01`/`Cajero123!`, y un catálogo de productos con códigos de barras de prueba (incluye Coca-Cola en tres presentaciones para probar el caso de múltiples códigos por producto). **Nunca uses estas credenciales en producción.**

## Backups

Este MVP no incluye automatización de respaldos (fuera de alcance según el documento de reconstrucción — sección de futuros módulos). Para producción, la recomendación mínima es un `pg_dump` programado:

```bash
pg_dump "$DATABASE_URL" | gzip > "backup_$(date +%F).sql.gz"
```

Cualquier proveedor gestionado (RDS, Supabase, Neon, etc.) suele ofrecer backups automáticos — preferible a mantener un cron propio.
