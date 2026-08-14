import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { Badge, Card, EmptyState, PageHeader } from "@pilotspos/ui";
import type { DashboardData } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const response = await fetch(`${API_URL}/reports/dashboard`, {
    headers: { cookie: cookies().toString() },
    cache: "no-store",
  });
  const data = response.ok ? ((await response.json()) as DashboardData) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Hola, ${user.fullName.split(" ")[0]}`}
        description={`${user.organizationName}${user.branchName ? ` · ${user.branchName}` : ""}`}
      />

      {!data ? (
        <EmptyState title="No se pudo cargar el panel" description="Intenta recargar la página." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Ventas de hoy" value={`$${data.todaySales.toFixed(2)}`} />
            <Kpi label="Transacciones" value={String(data.todayTransactions)} />
            <Kpi label="Productos vendidos" value={String(data.productsSoldToday)} />
            <Kpi label="Ticket promedio" value={`$${data.todayAvgTicket.toFixed(2)}`} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-ink">Ventas recientes</h2>
              {data.recentSales.length === 0 ? (
                <p className="text-sm text-muted">Aún no hay ventas registradas.</p>
              ) : (
                <div className="flex flex-col divide-y divide-line">
                  {data.recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <p className="text-ink">{sale.saleNumber}</p>
                        <p className="text-xs text-muted">
                          {sale.cashierName} · {new Date(sale.createdAt).toLocaleTimeString("es-MX")}
                        </p>
                      </div>
                      <span className="font-medium text-ink">${Number(sale.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-ink">Productos con stock bajo</h2>
              {data.lowStockProducts.length === 0 ? (
                <p className="text-sm text-muted">Todo el inventario está en niveles saludables.</p>
              ) : (
                <div className="flex flex-col divide-y divide-line">
                  {data.lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-ink">{product.name}</span>
                      <Badge tone="warning">
                        {product.stock} / mín. {product.minimumStock}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Actividad</h2>
              <Badge tone={data.openCashSessions > 0 ? "success" : "neutral"}>
                {data.openCashSessions} caja(s) abierta(s)
              </Badge>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
