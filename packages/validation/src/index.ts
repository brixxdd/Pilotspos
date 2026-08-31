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
// Clientes finales (menú digital y fiado)
// ---------------------------------------------------------------------------

/**
 * Teléfono guatemalteco: 8 dígitos, opcionalmente con el código +502 y con
 * espacios o guiones que la gente escribe y aquí se ignoran.
 */
export const customerPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^(?:\+?502)?[2-7]\d{7}$/, "Teléfono inválido (8 dígitos, ej. 5512 3456)")
      .transform((value) => value.replace(/^\+?502/, "")),
  );

export const customerRegisterSchema = z.object({
  organizationSlug: z.string().min(1),
  firstName: z.string().trim().min(2, "El nombre es requerido").max(60),
  lastName: z.string().trim().min(2, "El apellido es requerido").max(60),
  phone: customerPhoneSchema,
  addressLine: z.string().trim().max(200).optional().or(z.literal("")),
  // El repartidor encuentra la casa por la referencia, no por la dirección:
  // en Concepción Las Minas muchas casas no tienen número.
  addressReferences: z.string().trim().max(300).optional().or(z.literal("")),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});
export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;

export const customerLoginSchema = z.object({
  organizationSlug: z.string().min(1),
  phone: customerPhoneSchema,
  password: z.string().min(1, "La contraseña es requerida"),
});
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;

/**
 * Teléfono de repartidor: acepta números internacionales (el repartidor puede
 * venir de otra región). Se normaliza a dígitos sin el signo `+` — el mostrador
 * guarda exactamente lo que el repartidor escribirá después en el QR y en el
 * portal (/r).
 */
export const driverPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-()]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^\+?\d{8,15}$/, "Teléfono inválido")
      .transform((value) => value.replace(/^\+/, "")),
  );

export const customerProfileUpdateSchema = customerRegisterSchema
  .pick({ firstName: true, lastName: true, addressLine: true, addressReferences: true })
  .partial();
export type CustomerProfileUpdateInput = z.infer<typeof customerProfileUpdateSchema>;

/** Búsqueda de clientes desde el mostrador/panel: por nombre o teléfono. */
export const customerListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;

/**
 * Lo que el personal puede cambiar de un cliente: el techo del fiado y un
 * ajuste al saldo. El saldo es "lo que debe" (positivo = debe); un ajuste
 * negativo es un abono del cliente, uno positivo una carga extra. Nunca se
 * permite dejar el saldo en negativo.
 */
export const customerCreditUpdateSchema = z.object({
  creditLimit: z.number().nonnegative("El límite de crédito no puede ser negativo").optional(),
  balanceAdjustment: z.number().optional(),
});
export type CustomerCreditUpdateInput = z.infer<typeof customerCreditUpdateSchema>;

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

/**
 * Precisión de las cantidades con peso: hasta 3 decimales, igual que
 * numeric(12,3) en la BD. Se compara con epsilon porque 0.1 * 3 no da
 * exactamente 0.3 en punto flotante.
 *
 * Sólo valida la precisión — que un producto por pieza no acepte decimales
 * se valida en el dominio (`isValidQuantity` de @pilotspos/domain), donde
 * ya se conoce la unidad del producto.
 */
const WEIGHT_DECIMALS = 3;
const WEIGHT_PRECISION_MESSAGE = `La cantidad admite máximo ${WEIGHT_DECIMALS} decimales`;

function hasWeightPrecision(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const scaled = value * 10 ** WEIGHT_DECIMALS;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

export const productUnitSchema = z.enum(["UNIT", "LB"]);

export const productBarcodeSchema = z.string().min(4).max(64);

export const productCreateSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(160),
  description: z.string().max(500).optional().nullable(),
  sku: z.string().min(1, "El SKU es requerido").max(64),
  price: z.number().nonnegative("El precio no puede ser negativo"),
  cost: z.number().nonnegative("El costo no puede ser negativo").default(0),
  unit: productUnitSchema.default("UNIT"),
  stock: z.number().nonnegative().refine(hasWeightPrecision, WEIGHT_PRECISION_MESSAGE).default(0),
  minimumStock: z
    .number()
    .nonnegative()
    .refine(hasWeightPrecision, WEIGHT_PRECISION_MESSAGE)
    .default(0),
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

/**
 * Renglón de importación masiva. Igual que `productCreateSchema`, pero la
 * categoría se resuelve por NOMBRE (la hoja del cliente legacy no tiene UUIDs)
 * y el servidor la crea si no existe.
 */
export const productImportRowSchema = productCreateSchema
  .omit({ categoryId: true, supplierId: true })
  .extend({
    categoryName: z.string().trim().min(1).max(80).optional(),
  });
export type ProductImportRow = z.infer<typeof productImportRowSchema>;

export const productImportSchema = z.object({
  rows: z.array(productImportRowSchema).min(1, "La lista está vacía").max(500, "Máximo 500 productos por importación"),
});
export type ProductImportInput = z.infer<typeof productImportSchema>;

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------

export const inventoryReceiveItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z
    .number()
    .positive("La cantidad debe ser mayor a 0")
    .refine(hasWeightPrecision, WEIGHT_PRECISION_MESSAGE),
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
  quantity: z
    .number()
    .refine((v) => v !== 0, "La cantidad no puede ser 0")
    .refine(hasWeightPrecision, WEIGHT_PRECISION_MESSAGE),
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
  quantity: z
    .number()
    .positive("La cantidad debe ser mayor a 0")
    .refine(hasWeightPrecision, WEIGHT_PRECISION_MESSAGE),
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
// Pedidos del menú digital
// ---------------------------------------------------------------------------

/**
 * Renglón de pedido tal como lo manda el cliente desde el menú. El precio NO
 * viene del cliente: el servidor lo re-lee del catálogo para que nadie pueda
 * pedir a un precio que no es el de hoy.
 */
export const menuOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z
    .number()
    .positive("La cantidad debe ser mayor a 0")
    .refine(hasWeightPrecision, WEIGHT_PRECISION_MESSAGE),
});

export const menuOrderCreateSchema = z.object({
  items: z.array(menuOrderItemSchema).min(1, "El pedido está vacío").max(100),
  paymentChoice: z.enum(["CASH", "CREDIT", "MIXED"]),
  /** Cuánto quiere cargar a su cuenta. El servidor lo recorta a su disponible real. */
  creditAmount: z.number().nonnegative().default(0),
  cashAmount: z.number().nonnegative().default(0),
});
export type MenuOrderCreateInput = z.infer<typeof menuOrderCreateSchema>;

/** Acciones del mostrador sobre un pedido: confirmar, cancelar, completar, anotar. */
export const menuOrderUpdateSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  note: z.string().trim().max(300).optional(),
});
export type MenuOrderUpdateInput = z.infer<typeof menuOrderUpdateSchema>;

// ---------------------------------------------------------------------------
// Repartidores y entregas
// ---------------------------------------------------------------------------

export const driverCreateSchema = z.object({
  name: z.string().trim().min(2, "El nombre es requerido").max(120),
  phone: driverPhoneSchema,
  /** PIN de 4 a 8 dígitos para entrar a su portal. Lo asigna el mostrador. */
  pin: z
    .string()
    .trim()
    .min(4, "El PIN debe tener al menos 4 caracteres")
    .max(8, "El PIN no puede pasar de 8 caracteres")
    .regex(/^\d+$/, "El PIN debe ser numérico"),
});
export type DriverCreateInput = z.infer<typeof driverCreateSchema>;

export const driverUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: driverPhoneSchema.optional(),
  active: z.boolean().optional(),
  pin: z
    .string()
    .trim()
    .min(4, "El PIN debe tener al menos 4 caracteres")
    .max(8, "El PIN no puede pasar de 8 caracteres")
    .regex(/^\d+$/, "El PIN debe ser numérico")
    .optional(),
});
export type DriverUpdateInput = z.infer<typeof driverUpdateSchema>;

/** Login del repartidor en su portal. */
export const driverLoginSchema = z.object({
  phone: driverPhoneSchema,
  pin: z.string().trim().min(1, "El PIN es requerido").max(8),
});
export type DriverLoginInput = z.infer<typeof driverLoginSchema>;

/** Confirmación de entrega que manda el repartidor desde el QR del ticket. */
export const deliveryConfirmSchema = z.object({
  token: z.string().min(16).max(64),
  phone: driverPhoneSchema,
});
export type DeliveryConfirmInput = z.infer<typeof deliveryConfirmSchema>;

/** Confirmación del CLIENTE al recibir: el teléfono debe ser el del pedido. */
export const deliveryReceivedSchema = z.object({
  token: z.string().min(16).max(64),
  phone: customerPhoneSchema,
});
export type DeliveryReceivedInput = z.infer<typeof deliveryReceivedSchema>;

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
