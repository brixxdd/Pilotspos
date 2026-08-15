import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { Alert, Badge, Card, EmptyState, PageHeader, cn } from "@pilotspos/ui";
import { CheckCircleIcon, ReceiptIcon, WalletIcon } from "@/components/icons";
import { Sparkline } from "@/components/Sparkline";
import type { DashboardData } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

function Kpi({
  label,
  value,
  href,
  accent,
  trend,
}: {
  label: string;
  value: string;
  href: string;
  accent?: boolean;
  trend?: number[];
}) {
  return (
    <Link href={href} className="block">
      <Card
        className={cn(
          "h-full transition hover:-translate-y-0.5 hover:shadow-md",
          accent ? "border-l-4 border-l-accent" : "",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
            <p className={cn("mt-1 text-2xl font-semibold", accent ? "text-accent" : "text-ink")}>{value}</p>
          </div>
          {trend ? <Sparkline data={trend} className={accent ? "text-accent" : "text-muted"} /> : null}
        </div>
      </Card>
    </Link>
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
          {data.negativeStockProducts.length > 0 ? (
            <Alert tone="danger" title="Stock negativo por revisar">
              {data.negativeStockProducts.length === 1
                ? `${data.negativeStockProducts[0]!.name} quedó con stock ${data.negativeStockProducts[0]!.stock}.`
                : `${data.negativeStockProducts.length} productos quedaron con stock negativo.`}{" "}
              Puede pasar cuando dos cajas venden el mismo producto sin conexión y se sincronizan después. Ajustá el
              inventario cuando puedas.
            </Alert>
          ) : null}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi
              label="Ventas de hoy"
              value={`$${data.todaySales.toFixed(2)}`}
              href="/reports"
              accent
              trend={data.weekSalesTrend}
            />
            <Kpi label="Transacciones" value={String(data.todayTransactions)} href="/sales" />
            <Kpi label="Productos vendidos" value={String(data.productsSoldToday)} href="/products" />
            <Kpi label="Ticket promedio" value={`$${data.todayAvgTicket.toFixed(2)}`} href="/reports" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-ink">Ventas recientes</h2>
              {data.recentSales.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <ReceiptIcon className="text-muted" />
                  <p className="text-sm text-muted">Aún no hay ventas registradas.</p>
                </div>
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
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy/10 text-navy">
                    <CheckCircleIcon />
                  </span>
                  <p className="text-sm text-muted">Todo el inventario está en niveles saludables.</p>
                </div>
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
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    data.openCashSessions > 0 ? "bg-accent/10 text-accent" : "bg-app text-muted",
                  )}
                >
                  <WalletIcon width={16} height={16} />
                </span>
                <span className="text-sm text-ink">
                  {data.openCashSessions} caja(s) abierta(s)
                </span>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
