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
// Productos
// ---------------------------------------------------------------------------

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
  quantity: number;
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
