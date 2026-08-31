import type { PaymentMethod, ProductUnit } from "@pilotspos/types";

export interface ProductLookup {
  id: string;
  name: string;
  sku: string;
  price: string;
  unit: ProductUnit;
  stock: number;
  active: boolean;
  barcodes: { barcode: string }[];
}

export interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  /** Libras si `unit` es `LB`; piezas si es `UNIT`. */
  quantity: number;
  unit: ProductUnit;
  stock: number;
}

export interface SaleTicket {
  id: string;
  saleNumber: string;
  subtotal: string;
  discount: string;
  total: string;
  createdAt: string;
  branchName: string;
  registerName: string;
  cashierName: string;
  organizationName: string;
  items: { productName: string; unitPrice: string; quantity: number; subtotal: string }[];
  payments: { method: PaymentMethod; amount: string; receivedAmount: string | null; changeAmount: string | null }[];
}

export interface SuspendedSaleRow {
  id: string;
  saleNumber: string;
  note: string | null;
  createdAt: string;
  items: { productId: string; name: string; unitPrice: number; quantity: number; unit: ProductUnit; stock: number }[];
  discount: string;
}
