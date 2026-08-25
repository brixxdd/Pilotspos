export interface SalesReport {
  totalSales: number;
  transactionCount: number;
  averageTicket: number;
  byPaymentMethod: { method: string; total: number }[];
  byDay: { day: string; total: number; count: number }[];
}

export interface TopProductRow {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface CashierRow {
  userId: string;
  cashierName: string;
  totalSales: number;
  transactionCount: number;
}

export interface CashCutRow {
  id: string;
  registerName: string;
  cashierName: string;
  openingAmount: string;
  expectedCash: string | null;
  countedCash: string | null;
  difference: string | null;
  openedAt: string;
  closedAt: string | null;
}
