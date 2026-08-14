import type { PaymentMethod } from "@pilotspos/types";

export interface ProductLookup {
  id: string;
  name: string;
  sku: string;
  price: string;
  stock: number;
  active: boolean;
  barcodes: { barcode: string }[];
}

export interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
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
  items: { productId: string; name: string; unitPrice: number; quantity: number; stock: number }[];
  discount: string;
}
