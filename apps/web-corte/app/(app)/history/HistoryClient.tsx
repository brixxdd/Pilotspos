"use client";

import { useState } from "react";
import { Badge, Button, EmptyState, PageHeader } from "@pilotspos/ui";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { TicketModal } from "../sales/TicketModal";
import type { SaleTicket } from "../sales/types";

export interface SaleRow {
  id: string;
  saleNumber: string;
  total: string;
  status: "COMPLETED" | "CANCELED" | "SUSPENDED";
  createdAt: string;
  cashierName: string;
}

function formatQ(value: string): string {
  return Number(value).toLocaleString("es-GT", { style: "currency", currency: "GTQ" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("es-GT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryClient({ initialSales }: { initialSales: SaleRow[] }) {
  const [ticket, setTicket] = useState<SaleTicket | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function reprint(sale: SaleRow) {
    setLoadingId(sale.id);
    try {
      const { sale: full } = await apiFetch<{ sale: SaleTicket }>(`/sales/${sale.id}`);
      setTicket(full);
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : "No se pudo recuperar el ticket");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mis tickets"
        description={`Los tickets que cobraste, para reimprimirlos cuando el cliente lo pide.`}
      />

      {initialSales.length === 0 ? (
        <EmptyState title="Todavía no hay tickets" description="Cuando cobres una venta, aparecerá aquí para reimprimirla." />
      ) : (
        <div className="flex flex-col gap-3">
          {initialSales.map((sale) => (
            <div
              key={sale.id}
              className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-ink">{sale.saleNumber}</p>
                  <Badge tone={sale.status === "COMPLETED" ? "success" : "neutral"}>
                    {sale.status === "COMPLETED" ? "Completada" : "Cancelada"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {formatTime(sale.createdAt)} · {sale.cashierName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-heading text-base font-bold tabular-nums text-ink">{formatQ(sale.total)}</p>
                <Button variant="secondary" size="sm" loading={loadingId === sale.id} onClick={() => reprint(sale)}>
                  Reimprimir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TicketModal sale={ticket} onClose={() => setTicket(null)} />
    </div>
  );
}
