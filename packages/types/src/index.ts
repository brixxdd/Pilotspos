// Tipos de dominio compartidos entre apps/api, apps/web y demás paquetes.
// No debe depender de React, Next.js, Fastify ni de ningún runtime específico.

export type UUID = string;
export type ISODateString = string;

// ---------------------------------------------------------------------------
// Roles y permisos
// ---------------------------------------------------------------------------

export const USER_ROLES = ["ADMIN", "MANAGER", "CASHIER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ---------------------------------------------------------------------------
// Organización / sucursal / caja
// ---------------------------------------------------------------------------

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  active: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Branch {
  id: UUID;
  organizationId: UUID;
  name: string;
  slug: string;
  address: string | null;
  active: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Register {
  id: UUID;
  organizationId: UUID;
  branchId: UUID;
  name: string;
  active: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

export interface User {
  id: UUID;
  organizationId: UUID;
  branchId: UUID | null;
  username: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface SessionUser {
  id: UUID;
  username: string;
  fullName: string;
  role: UserRole;
  organizationId: UUID;
  organizationName: string;
  branchId: UUID | null;
  branchName: string | null;
}

// ---------------------------------------------------------------------------
// Clientes finales (menú digital y fiado)
// ---------------------------------------------------------------------------

/**
 * Cliente del negocio, no usuario del sistema: pide desde el menú digital y
 * puede comprar al fiado. Nunca tiene rol ni entra a la aplicación interna.
 */
export interface Customer {
  id: UUID;
  organizationId: UUID;
  firstName: string;
  lastName: string;
  phone: string;
  addressLine: string | null;
  addressReferences: string | null;
  creditLimit: number;
  balance: number;
  active: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Fila de la lista de clientes que ve el personal (mostrador y panel). */
export interface CustomerListItem {
  id: UUID;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  addressLine: string | null;
  addressReferences: string | null;
  creditLimit: number;
  balance: number;
  /** Cuánto puede fiar hoy: `creditLimit - balance`, nunca negativo. */
  availableCredit: number;
  active: boolean;
  createdAt: ISODateString;
}

/** Lo que el menú digital sabe del cliente que tiene la sesión abierta. */
export interface SessionCustomer {
  id: UUID;
  firstName: string;
  lastName: string;
  phone: string;
  addressLine: string | null;
  addressReferences: string | null;
  creditLimit: number;
  balance: number;
  /** Cuánto puede fiar hoy: `creditLimit - balance`, nunca negativo. */
  availableCredit: number;
  organizationId: UUID;
  organizationName: string;
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

/**
 * Unidad de venta de un producto.
 * - `UNIT`: se vende por pieza (cartón de huevo, ristra de longaniza). Cantidad entera.
 * - `LB`:   se vende por peso en libras. Cantidad con hasta 3 decimales (3.250 lb).
 *
 * Guatemala vende carne por libra, no por kilo — la báscula del mostrador
 * marca libras y el precio del pizarrón es por libra.
 */
export const PRODUCT_UNITS = ["UNIT", "LB"] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

/** Decimales admitidos en cantidades pesadas. Debe coincidir con numeric(12,3) en la BD. */
export const WEIGHT_DECIMALS = 3;

export interface Category {
  id: UUID;
  organizationId: UUID;
  name: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Supplier {
  id: UUID;
  organizationId: UUID;
  name: string;
  contactInfo: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Product {
  id: UUID;
  organizationId: UUID;
  name: string;
  description: string | null;
  sku: string;
  price: string;
  cost: string;
  /** Precio por libra cuando `unit` es `LB`; precio por pieza cuando es `UNIT`. */
  unit: ProductUnit;
  stock: number;
  minimumStock: number;
  categoryId: UUID | null;
  supplierId: UUID | null;
  active: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ProductBarcode {
  id: UUID;
  productId: UUID;
  barcode: string;
  createdAt: ISODateString;
}

export interface ProductWithBarcodes extends Product {
  barcodes: ProductBarcode[];
  categoryName: string | null;
}

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------

export const INVENTORY_MOVEMENT_TYPES = [
  "SALE",
  "PURCHASE",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "RETURN",
  "INITIAL_STOCK",
] as const;
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export interface InventoryMovement {
  id: UUID;
  organizationId: UUID;
  branchId: UUID;
  productId: UUID;
  type: InventoryMovementType;
  quantity: number;
  userId: UUID;
  reference: string | null;
  note: string | null;
  createdAt: ISODateString;
}

// ---------------------------------------------------------------------------
// Caja
// ---------------------------------------------------------------------------

export const CASH_SESSION_STATUSES = ["OPEN", "CLOSED"] as const;
export type CashSessionStatus = (typeof CASH_SESSION_STATUSES)[number];

export const CASH_MOVEMENT_TYPES = [
  "OPENING",
  "SALE",
  "WITHDRAWAL",
  "DEPOSIT",
  "REFUND",
  "ADJUSTMENT",
] as const;
export type CashMovementType = (typeof CASH_MOVEMENT_TYPES)[number];

export interface CashSession {
  id: UUID;
  organizationId: UUID;
  branchId: UUID;
  registerId: UUID;
  userId: UUID;
  openingAmount: string;
  closingAmount: string | null;
  expectedCash: string | null;
  countedCash: string | null;
  difference: string | null;
  status: CashSessionStatus;
  openedAt: ISODateString;
  closedAt: ISODateString | null;
}

export interface CashMovement {
  id: UUID;
  organizationId: UUID;
  cashSessionId: UUID;
  type: CashMovementType;
  amount: string;
  userId: UUID;
  note: string | null;
  createdAt: ISODateString;
}

// ---------------------------------------------------------------------------
// Ventas
// ---------------------------------------------------------------------------

export const SALE_STATUSES = ["COMPLETED", "CANCELED", "SUSPENDED"] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER", "MIXED"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Sale {
  id: UUID;
  organizationId: UUID;
  branchId: UUID;
  registerId: UUID;
  cashSessionId: UUID | null;
  userId: UUID;
  saleNumber: string;
  subtotal: string;
  discount: string;
  total: string;
  status: SaleStatus;
  createdAt: ISODateString;
}

export interface SaleItem {
  id: UUID;
  saleId: UUID;
  productId: UUID;
  productName: string;
  unitPrice: string;
  quantity: number;
  subtotal: string;
}

export interface Payment {
  id: UUID;
  saleId: UUID;
  method: PaymentMethod;
  amount: string;
  receivedAmount: string | null;
  changeAmount: string | null;
  createdAt: ISODateString;
}

export interface CartItem {
  productId: UUID;
  barcode: string | null;
  name: string;
  unitPrice: number;
  /** Piezas si `unit` es `UNIT`; libras (hasta 3 decimales) si es `LB`. */
  quantity: number;
  unit: ProductUnit;
  stock: number;
}

export interface SuspendedSale {
  id: UUID;
  organizationId: UUID;
  branchId: UUID;
  registerId: UUID;
  userId: UUID;
  saleNumber: string;
  items: CartItem[];
  discount: number;
  note: string | null;
  createdAt: ISODateString;
}

// ---------------------------------------------------------------------------
// API — envoltorios comunes
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Pedidos del menú digital
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_PAYMENT_CHOICES = ["CASH", "CREDIT", "MIXED"] as const;
export type OrderPaymentChoice = (typeof ORDER_PAYMENT_CHOICES)[number];

/** Renglón del pedido, snapshot del catálogo en el momento de pedir. */
export interface MenuOrderItem {
  productId: UUID;
  name: string;
  unit: ProductUnit;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

/** Pedido hecho desde el menú digital. El crédito pedido queda apuntado, no reservado. */
export interface MenuOrder {
  id: UUID;
  organizationId: UUID;
  organizationName: string | null;
  branchId: UUID;
  branchName: string | null;
  orderNumber: string;
  customerId: UUID | null;
  customerName: string;
  customerPhone: string;
  addressLine: string | null;
  addressReferences: string | null;
  items: MenuOrderItem[];
  paymentChoice: OrderPaymentChoice;
  requestedCredit: number;
  requestedCash: number;
  estimatedTotal: number;
  status: OrderStatus;
  note: string | null;
  whatsappSentAt: ISODateString | null;
  resolvedById: UUID | null;
  resolvedByName: string | null;
  resolvedAt: ISODateString | null;
  /** Token opaco del QR de entrega. Solo lo tienen los pedidos confirmados o completados. */
  deliveryToken: string | null;
  driverId: UUID | null;
  driverName: string | null;
  deliveredAt: ISODateString | null;
  /** Confirmación del cliente al recibir. `null` = entregado pero sin confirmar por el cliente. */
  customerConfirmedAt: ISODateString | null;
  createdAt: ISODateString;
}

// ---------------------------------------------------------------------------
// Repartidores
// ---------------------------------------------------------------------------

export interface Driver {
  id: UUID;
  organizationId: UUID;
  name: string;
  phone: string;
  active: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Lo que el repartidor ve al entrar a su portal (/r). */
export interface SessionDriver {
  id: UUID;
  name: string;
  phone: string;
  organizationId: UUID;
  organizationName: string;
}

/** Entrega del historial del repartidor en su portal. */
export interface DriverDeliveryRecord {
  id: UUID;
  orderNumber: string;
  branchName: string;
  customerName: string;
  customerPhone: string;
  addressLine: string | null;
  estimatedTotal: number;
  status: OrderStatus;
  deliveredAt: ISODateString | null;
  customerConfirmedAt: ISODateString | null;
  createdAt: ISODateString;
}
