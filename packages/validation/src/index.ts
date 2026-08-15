import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  organizationSlug: z.string().min(1, "Selecciona una organización"),
  branchId: z.string().uuid().optional(),
  username: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

export const userRoleSchema = z.enum(["ADMIN", "MANAGER", "CASHIER"]);

export const userCreateSchema = z.object({
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(32)
    .regex(/^[a-z0-9._-]+$/i, "Solo letras, números, puntos, guiones"),
  fullName: z.string().min(1, "El nombre es requerido").max(120),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: userRoleSchema,
  branchId: z.string().uuid().nullable().optional(),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  role: userRoleSchema.optional(),
  branchId: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

export const productBarcodeSchema = z.string().min(4).max(64);

export const productCreateSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(160),
  description: z.string().max(500).optional().nullable(),
  sku: z.string().min(1, "El SKU es requerido").max(64),
  price: z.number().nonnegative("El precio no puede ser negativo"),
  cost: z.number().nonnegative("El costo no puede ser negativo").default(0),
  stock: z.number().int().nonnegative().default(0),
  minimumStock: z.number().int().nonnegative().default(0),
  categoryId: z.string().uuid().nullable().optional(),
  supplierId: z.string().uuid().nullable().optional(),
  barcodes: z.array(productBarcodeSchema).default([]),
  active: z.boolean().default(true),
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema.partial();
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(80),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------

export const inventoryReceiveItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
});

export const inventoryReceiveSchema = z.object({
  items: z.array(inventoryReceiveItemSchema).min(1, "Agrega al menos un producto"),
  supplierId: z.string().uuid().nullable().optional(),
  reference: z.string().max(120).optional(),
  note: z.string().max(300).optional(),
});
export type InventoryReceiveInput = z.infer<typeof inventoryReceiveSchema>;

export const inventoryAdjustSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().refine((v) => v !== 0, "La cantidad no puede ser 0"),
  note: z.string().max(300).optional(),
});
export type InventoryAdjustInput = z.infer<typeof inventoryAdjustSchema>;

// ---------------------------------------------------------------------------
// Caja
// ---------------------------------------------------------------------------

export const cashOpeningSchema = z.object({
  registerId: z.string().uuid(),
  openingAmount: z.number().nonnegative("El fondo inicial no puede ser negativo"),
});
export type CashOpeningInput = z.infer<typeof cashOpeningSchema>;

export const cashMovementSchema = z.object({
  type: z.enum(["WITHDRAWAL", "DEPOSIT", "ADJUSTMENT"]),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  note: z.string().max(300).optional(),
});
export type CashMovementInput = z.infer<typeof cashMovementSchema>;

export const cashCloseSchema = z.object({
  countedCash: z.number().nonnegative("El efectivo contado no puede ser negativo"),
  note: z.string().max(300).optional(),
});
export type CashCloseInput = z.infer<typeof cashCloseSchema>;

// ---------------------------------------------------------------------------
// Ventas
// ---------------------------------------------------------------------------

export const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
});

export const paymentSchema = z.object({
  method: z.enum(["CASH", "CARD", "TRANSFER", "MIXED"]),
  amount: z.number().nonnegative(),
  receivedAmount: z.number().nonnegative().optional(),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const saleSchema = z.object({
  registerId: z.string().uuid(),
  items: z.array(saleItemSchema).min(1, "El carrito está vacío"),
  discount: z.number().nonnegative().default(0),
  payments: z.array(paymentSchema).min(1, "Agrega al menos un método de pago"),
  /** UUID generado por el cliente. Presente solo al sincronizar una venta cerrada sin conexión. */
  clientSaleId: z.string().uuid().optional(),
});
export type SaleInput = z.infer<typeof saleSchema>;

/** Igual que `saleSchema`, pero exige `clientSaleId` — usado por /sales/sync para reintentos idempotentes. */
export const syncSaleSchema = saleSchema.extend({
  clientSaleId: z.string().uuid(),
});
export type SyncSaleInput = z.infer<typeof syncSaleSchema>;

export const suspendSaleSchema = z.object({
  registerId: z.string().uuid(),
  items: z.array(saleItemSchema).min(1),
  discount: z.number().nonnegative().default(0),
  note: z.string().max(300).optional(),
});
export type SuspendSaleInput = z.infer<typeof suspendSaleSchema>;

// ---------------------------------------------------------------------------
// Organizaciones / sucursales / cajas registradoras
// ---------------------------------------------------------------------------

export const branchCreateSchema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(300).optional(),
});
export type BranchCreateInput = z.infer<typeof branchCreateSchema>;

export const registerCreateSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1).max(80),
});
export type RegisterCreateInput = z.infer<typeof registerCreateSchema>;
