import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "../../shared/db.js";

export interface DateRange {
  from?: Date;
  to?: Date;
}

function saleDateConditions(organizationId: string, range: DateRange) {
  const conditions = [
    eq(schema.sales.organizationId, organizationId),
    eq(schema.sales.status, "COMPLETED"),
  ];
  if (range.from) conditions.push(gte(schema.sales.createdAt, range.from));
  if (range.to) conditions.push(lte(schema.sales.createdAt, range.to));
  return conditions;
}

export async function getSalesReport(organizationId: string, range: DateRange) {
  const whereClause = and(...saleDateConditions(organizationId, range));

  const [totals] = await db
    .select({
      totalSales: sql<string>`coalesce(sum(${schema.sales.total}), 0)`,
      transactionCount: sql<number>`count(*)::int`,
    })
    .from(schema.sales)
    .where(whereClause);

  const totalSales = Number(totals?.totalSales ?? 0);
  const transactionCount = totals?.transactionCount ?? 0;
  const averageTicket = transactionCount > 0 ? totalSales / transactionCount : 0;

  const byPaymentMethod = await db
    .select({
      method: schema.payments.method,
      total: sql<string>`coalesce(sum(${schema.payments.amount}), 0)`,
    })
    .from(schema.payments)
    .innerJoin(schema.sales, eq(schema.sales.id, schema.payments.saleId))
    .where(whereClause)
    .groupBy(schema.payments.method);

  const byDay = await db
    .select({
      day: sql<string>`to_char(${schema.sales.createdAt}, 'YYYY-MM-DD')`,
      total: sql<string>`coalesce(sum(${schema.sales.total}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.sales)
    .where(whereClause)
    .groupBy(sql`to_char(${schema.sales.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${schema.sales.createdAt}, 'YYYY-MM-DD')`);

  return {
    totalSales,
    transactionCount,
    averageTicket,
    byPaymentMethod: byPaymentMethod.map((row) => ({ method: row.method, total: Number(row.total) })),
    byDay: byDay.map((row) => ({ day: row.day, total: Number(row.total), count: row.count })),
  };
}

export async function getTopProducts(organizationId: string, range: DateRange, limit = 10) {
  const whereClause = and(...saleDateConditions(organizationId, range));

  const rows = await db
    .select({
      productId: schema.saleItems.productId,
      productName: schema.saleItems.productName,
      quantity: sql<number>`sum(${schema.saleItems.quantity})::int`,
      revenue: sql<string>`coalesce(sum(${schema.saleItems.subtotal}), 0)`,
    })
    .from(schema.saleItems)
    .innerJoin(schema.sales, eq(schema.sales.id, schema.saleItems.saleId))
    .where(whereClause)
    .groupBy(schema.saleItems.productId, schema.saleItems.productName)
    .orderBy(desc(sql`sum(${schema.saleItems.quantity})`))
    .limit(limit);

  return rows.map((row) => ({ ...row, revenue: Number(row.revenue) }));
}

export async function getCashiersReport(organizationId: string, range: DateRange) {
  const whereClause = and(...saleDateConditions(organizationId, range));

  const rows = await db
    .select({
      userId: schema.sales.userId,
      cashierName: schema.users.fullName,
      totalSales: sql<string>`coalesce(sum(${schema.sales.total}), 0)`,
      transactionCount: sql<number>`count(*)::int`,
    })
    .from(schema.sales)
    .innerJoin(schema.users, eq(schema.users.id, schema.sales.userId))
    .where(whereClause)
    .groupBy(schema.sales.userId, schema.users.fullName)
    .orderBy(desc(sql`sum(${schema.sales.total})`));

  return rows.map((row) => ({ ...row, totalSales: Number(row.totalSales) }));
}

export async function getCashReport(organizationId: string, range: DateRange) {
  const conditions = [
    eq(schema.cashSessions.organizationId, organizationId),
    eq(schema.cashSessions.status, "CLOSED"),
  ];
  if (range.from) conditions.push(gte(schema.cashSessions.openedAt, range.from));
  if (range.to) conditions.push(lte(schema.cashSessions.openedAt, range.to));

  return db
    .select({
      id: schema.cashSessions.id,
      registerName: schema.registers.name,
      cashierName: schema.users.fullName,
      openingAmount: schema.cashSessions.openingAmount,
      expectedCash: schema.cashSessions.expectedCash,
      countedCash: schema.cashSessions.countedCash,
      difference: schema.cashSessions.difference,
      openedAt: schema.cashSessions.openedAt,
      closedAt: schema.cashSessions.closedAt,
    })
    .from(schema.cashSessions)
    .innerJoin(schema.registers, eq(schema.registers.id, schema.cashSessions.registerId))
    .innerJoin(schema.users, eq(schema.users.id, schema.cashSessions.userId))
    .where(and(...conditions))
    .orderBy(desc(schema.cashSessions.closedAt));
}

export async function getDashboard(organizationId: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [todaySummary, topToday] = await Promise.all([
    getSalesReport(organizationId, { from: startOfToday }),
    getTopProducts(organizationId, { from: startOfToday }, 5),
  ]);

  const productsSoldToday = topToday.reduce((sum, item) => sum + item.quantity, 0);

  const recentSales = await db
    .select({
      id: schema.sales.id,
      saleNumber: schema.sales.saleNumber,
      total: schema.sales.total,
      createdAt: schema.sales.createdAt,
      cashierName: schema.users.fullName,
    })
    .from(schema.sales)
    .innerJoin(schema.users, eq(schema.users.id, schema.sales.userId))
    .where(and(eq(schema.sales.organizationId, organizationId), eq(schema.sales.status, "COMPLETED")))
    .orderBy(desc(schema.sales.createdAt))
    .limit(5);

  const lowStockProducts = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      stock: schema.products.stock,
      minimumStock: schema.products.minimumStock,
    })
    .from(schema.products)
    .where(
      and(
        eq(schema.products.organizationId, organizationId),
        eq(schema.products.active, true),
        lte(schema.products.stock, schema.products.minimumStock),
      ),
    )
    .orderBy(asc(schema.products.stock))
    .limit(5);

  const openSessionsRows = await db
    .select({ openSessions: sql<number>`count(*)::int` })
    .from(schema.cashSessions)
    .where(and(eq(schema.cashSessions.organizationId, organizationId), eq(schema.cashSessions.status, "OPEN")));

  return {
    todaySales: todaySummary.totalSales,
    todayTransactions: todaySummary.transactionCount,
    todayAvgTicket: todaySummary.averageTicket,
    productsSoldToday,
    topProductsToday: topToday,
    recentSales,
    lowStockProducts,
    openCashSessions: openSessionsRows[0]?.openSessions ?? 0,
  };
}

