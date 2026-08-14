"use client";

import { useEffect, useState } from "react";
import { Card, DataTable, Input, PageHeader } from "@pilotspos/ui";
import { apiFetch } from "@/lib/api-client";
import { Bar } from "./Bar";
import type { CashCutRow, CashierRow, SalesReport, TopProductRow } from "./types";

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  MIXED: "Mixto",
};

function defaultFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function ReportsClient() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(todayStr());
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductRow[]>([]);
  const [cashiers, setCashiers] = useState<CashierRow[]>([]);
  const [cashCuts, setCashCuts] = useState<CashCutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = `from=${from}T00:00:00&to=${to}T23:59:59`;
      const [salesRes, topRes, cashiersRes, cashRes] = await Promise.all([
        apiFetch<SalesReport>(`/reports/sales?${params}`),
        apiFetch<{ items: TopProductRow[] }>(`/reports/top-products?${params}`),
        apiFetch<{ items: CashierRow[] }>(`/reports/cashiers?${params}`),
        apiFetch<{ items: CashCutRow[] }>(`/reports/cash?${params}`),
      ]);
      if (cancelled) return;
      setSales(salesRes);
      setTopProducts(topRes.items);
      setCashiers(cashiersRes.items);
      setCashCuts(cashRes.items);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const maxDay = Math.max(...(sales?.byDay.map((d) => d.total) ?? [0]), 1);
  const maxProduct = Math.max(...topProducts.map((p) => p.revenue), 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reportes"
        description="Ventas, productos más vendidos, desempeño de cajeros y cortes de caja."
        actions={
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-muted">a</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        }
      />

      {sales ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">Ventas totales</p>
            <p className="mt-1 text-2xl font-semibold text-ink">${sales.totalSales.toFixed(2)}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">Transacciones</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{sales.transactionCount}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">Ticket promedio</p>
            <p className="mt-1 text-2xl font-semibold text-ink">${sales.averageTicket.toFixed(2)}</p>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink">Ventas por día</h2>
          {!loading && sales && sales.byDay.length > 0 ? (
            <div className="flex flex-col gap-2">
              {sales.byDay.map((d) => (
                <Bar key={d.day} label={d.day} value={d.total} max={maxDay} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Sin ventas en el rango seleccionado.</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink">Ventas por método de pago</h2>
          {!loading && sales && sales.byPaymentMethod.length > 0 ? (
            <div className="flex flex-col gap-2">
              {sales.byPaymentMethod.map((p) => (
                <Bar
                  key={p.method}
                  label={PAYMENT_LABELS[p.method] ?? p.method}
                  value={p.total}
                  max={sales.totalSales || 1}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Sin datos.</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">Top productos</h2>
        {!loading && topProducts.length > 0 ? (
          <div className="flex flex-col gap-2">
            {topProducts.map((p, index) => (
              <div key={p.productId} className="flex items-center gap-3">
                <span className="w-5 text-xs text-muted">{index + 1}.</span>
                <Bar label={p.productName} value={p.revenue} max={maxProduct} />
                <span className="w-16 flex-shrink-0 text-right text-xs text-muted">{p.quantity} und.</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Sin productos vendidos en el rango seleccionado.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">Ventas por cajero</h2>
        <DataTable
          loading={loading}
          columns={[
            { key: "cashier", header: "Cajero", render: (c) => c.cashierName },
            { key: "count", header: "Transacciones", render: (c) => String(c.transactionCount) },
            { key: "total", header: "Total vendido", render: (c) => `$${c.totalSales.toFixed(2)}` },
          ]}
          rows={cashiers}
          rowKey={(c) => c.userId}
          emptyTitle="Sin ventas en el rango seleccionado"
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">Cortes de caja</h2>
        <DataTable
          loading={loading}
          columns={[
            { key: "register", header: "Caja", render: (c) => c.registerName },
            { key: "cashier", header: "Cajero", render: (c) => c.cashierName },
            { key: "expected", header: "Esperado", render: (c) => `$${Number(c.expectedCash ?? 0).toFixed(2)}` },
            { key: "counted", header: "Contado", render: (c) => `$${Number(c.countedCash ?? 0).toFixed(2)}` },
            {
              key: "difference",
              header: "Diferencia",
              render: (c) => {
                const diff = Number(c.difference ?? 0);
                return (
                  <span className={diff === 0 ? "text-ink" : diff > 0 ? "text-success" : "text-danger"}>
                    ${diff.toFixed(2)}
                  </span>
                );
              },
            },
            {
              key: "closedAt",
              header: "Cerrada",
              render: (c) => (c.closedAt ? new Date(c.closedAt).toLocaleString("es-MX") : "—"),
            },
          ]}
          rows={cashCuts}
          rowKey={(c) => c.id}
          emptyTitle="Sin cortes de caja en el rango seleccionado"
        />
      </Card>
    </div>
  );
}
