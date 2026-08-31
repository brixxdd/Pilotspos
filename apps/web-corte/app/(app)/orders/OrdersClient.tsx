"use client";

import { useCallback, useEffect, useState } from "react";
import type { MenuOrder, OrderStatus } from "@pilotspos/types";
import { formatQuantity } from "@pilotspos/domain";
import { Badge, Button, EmptyState, PageHeader } from "@pilotspos/ui";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { DeliveryQRModal } from "./DeliveryQRModal";

interface ListResponse {
  items: MenuOrder[];
  total: number;
}

type Filter = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "ALL";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "PENDING", label: "Pendientes" },
  { value: "CONFIRMED", label: "Confirmados" },
  { value: "COMPLETED", label: "Completados" },
  { value: "CANCELLED", label: "Cancelados" },
  { value: "ALL", label: "Todos" },
];

const STATUS_BADGE: Record<OrderStatus, { label: string; tone: "warning" | "info" | "success" | "danger" }> = {
  PENDING: { label: "Pendiente", tone: "warning" },
  CONFIRMED: { label: "Confirmado", tone: "info" },
  COMPLETED: { label: "Completado", tone: "success" },
  CANCELLED: { label: "Cancelado", tone: "danger" },
};

function formatQ(value: number): string {
  return value.toLocaleString("es-GT", { style: "currency", currency: "GTQ" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("es-GT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrdersClient({ canManage }: { canManage: boolean }) {
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [orders, setOrders] = useState<MenuOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrOrder, setQrOrder] = useState<MenuOrder | null>(null);

  const load = useCallback(async (next: Filter) => {
    setLoading(true);
    setError(null);
    try {
      const status = next === "ALL" ? undefined : next;
      const query = status ? `?status=${status}&pageSize=100` : "?pageSize=100";
      const response = await apiFetch<ListResponse>(`/orders${query}`);
      setOrders(response.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudieron cargar los pedidos");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  async function changeStatus(order: MenuOrder, status: "CONFIRMED" | "CANCELLED" | "COMPLETED") {
    try {
      const { order: updated } = await apiFetch<{ order: MenuOrder }>(`/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : "No se pudo actualizar el pedido");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos del menú"
        description="Los pedidos que los clientes mandaron por WhatsApp. El total se confirma al pesar la carne."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === value
                ? "border-accent bg-accent text-white"
                : "border-line bg-white text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Cargando pedidos…</p>
      ) : orders.length === 0 ? (
        <EmptyState title="Sin pedidos aquí" description="Cuando alguien pida desde el menú digital, aparecerá en esta lista." />
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const badge = STATUS_BADGE[order.status];
            return (
              <div key={order.id} className="rounded-lg border border-line bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-heading text-lg font-bold text-ink">{order.orderNumber}</p>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">
                      {order.branchName ?? ""} · {formatTime(order.createdAt)}
                    </p>
                  </div>
                  <p className="font-heading text-lg font-bold tabular-nums text-ink">{formatQ(order.estimatedTotal)}</p>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Cliente</h3>
                    <p className="mt-1 text-sm font-medium text-ink">{order.customerName}</p>
                    <p className="text-sm text-muted">{order.customerPhone}</p>
                    {order.addressLine ? <p className="mt-1 text-sm text-muted">{order.addressLine}</p> : null}
                    {order.addressReferences ? <p className="text-sm text-muted">{order.addressReferences}</p> : null}
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Pago pedido</h3>
                    <p className="mt-1 text-sm text-ink">
                      {order.requestedCredit > 0 ? (
                        <>
                          {formatQ(order.requestedCredit)} fiado + {formatQ(order.requestedCash)} en efectivo
                        </>
                      ) : (
                        <>{formatQ(order.requestedCash)} en efectivo</>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      El crédito queda apuntado; se confirma al pesar.
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Productos</h3>
                  <ul className="mt-2 overflow-hidden rounded-md border border-line">
                    {order.items.map((item, index) => (
                      <li
                        key={`${item.productId}-${index}`}
                        className={`flex items-center justify-between px-3 py-2 text-sm ${
                          index > 0 ? "border-t border-line" : ""
                        }`}
                      >
                        <span className="text-ink">
                          {formatQuantity(item.quantity, item.unit)} — {item.name}
                        </span>
                        <span className="tabular-nums text-muted">{formatQ(item.subtotal)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {order.note ? (
                  <p className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">Nota: {order.note}</p>
                ) : null}

                {order.deliveredAt ? (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
                    <span>✓</span> Entregado por {order.driverName ?? "repartidor"} ·{" "}
                    {order.deliveredAt ? formatTime(order.deliveredAt) : ""}
                  </p>
                ) : order.deliveryToken && (order.status === "CONFIRMED" || order.status === "COMPLETED") ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-app px-3 py-2">
                    <p className="text-sm text-muted">
                      Sin entregar aún. Imprime el QR para el repartidor.
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => setQrOrder(order)}>
                      QR de entrega
                    </Button>
                  </div>
                ) : null}

                {canManage && order.status === "PENDING" ? (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (confirm(`¿Cancelar el pedido ${order.orderNumber}?`)) changeStatus(order, "CANCELLED");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={() => changeStatus(order, "CONFIRMED")}>
                      Confirmar pedido
                    </Button>
                  </div>
                ) : null}

                {canManage && order.status === "CONFIRMED" ? (
                  <div className="mt-4 flex justify-end">
                    <Button size="sm" onClick={() => changeStatus(order, "COMPLETED")}>
                      Marcar completado
                    </Button>
                  </div>
                ) : null}

                {order.resolvedByName ? (
                  <p className="mt-3 text-right text-xs text-muted">
                    Resuelto por {order.resolvedByName} · {order.resolvedAt ? formatTime(order.resolvedAt) : ""}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      <DeliveryQRModal order={qrOrder} onClose={() => setQrOrder(null)} />
    </div>
  );
}
