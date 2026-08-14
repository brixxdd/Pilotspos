export interface RegisterRow {
  id: string;
  name: string;
}

export interface CashSessionRow {
  id: string;
  registerId: string;
  openingAmount: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
}

export interface CashSummary {
  openingAmount: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  deposits: number;
  withdrawals: number;
  refunds: number;
  expectedCash: number;
  countedCash?: number;
  difference?: number;
}
