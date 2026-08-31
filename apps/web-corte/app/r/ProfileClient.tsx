"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DriverDeliveryRecord, SessionDriver } from "@pilotspos/types";
import { logoutDriver } from "@/lib/driver-client";

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

export function ProfileClient({
  driver,
  initialDeliveries,
}: {
  driver: SessionDriver;
  initialDeliveries: DriverDeliveryRecord[];
}) {
  const router = useRouter();
  const [deliveries] = useState(initialDeliveries);

  const deliveredCount = deliveries.filter((d) => d.deliveredAt).length;
  const customerConfirmedCount = deliveries.filter((d) => d.customerConfirmedAt).length;

  async function handleLogout() {
    try {
      await logoutDriver();
    } finally {
      router.push("/r/entrar");
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen bg-app px-4 py-8" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-heading text-2xl font-bold text-ink">Hola, {driver.name.split(" ")[0]}</p>
            <p className="mt-1 text-sm text-muted">
              {driver.organizationName} · {driver.phone}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-danger hover:text-danger"
          >
            Salir
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-surface p-4 text-center">
            <p className="font-heading text-2xl font-bold tabular-nums text-ink">{deliveredCount}</p>
            <p className="mt-1 text-xs text-muted">Entregas</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4 text-center">
            <p className="font-heading text-2xl font-bold tabular-nums text-success">{customerConfirmedCount}</p>
            <p className="mt-1 text-xs text-muted">Confirmadas por el cliente</p>
          </div>
        </div>

        <h2 className="mt-2 font-heading text-base font-semibold text-ink">Su registro de entregas</h2>

        {deliveries.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center">
            <p className="text-lg">🛵</p>
            <p className="mt-2 text-sm font-medium text-ink">Todavía no tiene entregas</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Cuando confirme una entrega con el QR del ticket, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {deliveries.map((delivery) => (
              <div key={delivery.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-ink">{delivery.orderNumber}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {delivery.branchName} · {formatTime(delivery.createdAt)}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums text-ink">{formatQ(delivery.estimatedTotal)}</p>
                </div>

                <p className="mt-2 text-sm text-ink">{delivery.customerName}</p>
                <p className="text-xs text-muted">{delivery.customerPhone}</p>
                {delivery.addressLine ? <p className="text-xs text-muted">{delivery.addressLine}</p> : null}

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {delivery.deliveredAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
                      ✓ Entregado · {formatTime(delivery.deliveredAt)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 font-medium text-warning">
                      Pendiente de entrega
                    </span>
                  )}
                  {delivery.customerConfirmedAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
                      ✓✓ Confirmado por el cliente
                    </span>
                  ) : delivery.deliveredAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 font-medium text-warning">
                      Falta que el cliente confirme
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
