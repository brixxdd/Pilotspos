export interface DashboardData {
  todaySales: number;
  todayTransactions: number;
  todayAvgTicket: number;
  productsSoldToday: number;
  topProductsToday: { productId: string; productName: string; quantity: number; revenue: number }[];
  recentSales: { id: string; saleNumber: string; total: string; createdAt: string; cashierName: string }[];
  lowStockProducts: { id: string; name: string; stock: number; minimumStock: number }[];
  negativeStockProducts: { id: string; name: string; stock: number }[];
  openCashSessions: number;
  weekSalesTrend: number[];
}
