"use client";

import { useEffect, useState } from "react";
import type { ProductUnit } from "@pilotspos/types";
import { apiFetch, ApiClientError } from "@/lib/api-client";

interface PublicDelivery {
  orderNumber: string;
  branchName: string;
  customerName: string;
  customerPhone: string;
  addressLine: string | null;
  addressReferences: string | null;
  items: Array<{ name: string; unit: ProductUnit; quantity: number }>;
  estimatedTotal: number;
  requestedCredit: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  driverName: string | null;
  deliveredAt: string | null;
  customerConfirmedAt: string | null;
}

const decimals = new Intl.NumberFormat("es-GT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const quetzales = { format: (value: number) => `Q${decimals.format(value)}` };

function formatQuantity(quantity: number, unit: ProductUnit) {
  if (unit === "UNIT") return `${quantity}`;
  return `${Number.isInteger(quantity) ? quantity : quantity.toFixed(1)} lb`;
}

export function DeliveryClient({ token }: { token: string }) {
  const [delivery, setDelivery] = useState<PublicDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<PublicDelivery>(`/public/deliveries/${token}`)
      .then((data) => {
        if (!cancelled) setDelivery(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiClientError ? err.message : "QR inválido");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function confirm() {
    const normalized = phone.replace(/[\s-]/g, "");
    if (!/^\d{8}$/.test(normalized)) {
      setError("Escribe tu teléfono a 8 dígitos (ej. 5512 3456)");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await apiFetch<PublicDelivery>("/public/deliveries/confirm", {
        method: "POST",
        body: JSON.stringify({ token, phone: normalized }),
      });
      setDelivery(updated);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo confirmar la entrega");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmReceived() {
    const normalized = phone.replace(/[\s-]/g, "");
    if (!/^\d{8}$/.test(normalized)) {
      setError("Escribe tu teléfono a 8 dígitos (ej. 5512 3456)");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await apiFetch<PublicDelivery>("/public/deliveries/received", {
        method: "POST",
        body: JSON.stringify({ token, phone: normalized }),
      });
      setDelivery(updated);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo confirmar la recepción");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app px-4">
        <p className="text-sm text-muted">Cargando pedido…</p>
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app px-4">
        <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="text-lg">📦</p>
          <p className="mt-2 text-sm font-semibold text-ink">No se encontró este pedido</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {error}. Revisa que el QR esté completo o pide al mostrador uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  if (!delivery) return null;

  const delivered = Boolean(delivery.deliveredAt);
  const customerConfirmed = Boolean(delivery.customerConfirmedAt);
  const actionable = delivery.status === "CONFIRMED" || delivery.status === "COMPLETED";

  return (
    <main className="min-h-screen bg-app px-4 py-8" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <header className="text-center">
          <p className="font-heading text-2xl font-bold text-ink">Entrega {delivery.orderNumber}</p>
          <p className="mt-1 text-sm text-muted">{delivery.branchName}</p>
        </header>

        {delivered && customerConfirmed ? (
          <div className="rounded-2xl border border-success/30 bg-success/[0.08] p-5 text-center">
            <p className="text-3xl">✓✓</p>
            <p className="mt-1 text-sm font-semibold text-ink">Entrega confirmada</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {delivery.driverName ?? "El repartidor"} registró la entrega y el cliente confirmó
              que la recibió.
            </p>
            <p className="mt-2 text-xs text-muted">
              {delivery.deliveredAt ? `Entregado ${new Date(delivery.deliveredAt).toLocaleString("es-GT")}` : ""}
            </p>
          </div>
        ) : delivered ? (
          <>
            <div className="rounded-2xl border border-success/30 bg-success/[0.08] p-4 text-center">
              <p className="text-3xl">✓</p>
              <p className="mt-1 text-sm font-semibold text-ink">Entregado por {delivery.driverName ?? "el repartidor"}</p>
              <p className="mt-1 text-xs text-muted">
                {delivery.deliveredAt ? new Date(delivery.deliveredAt).toLocaleString("es-GT") : ""}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-sm font-semibold text-ink">¿Recibiste tu pedido?</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Confirma con tu teléfono para cerrar la entrega. Si no eres {delivery.customerName},
                pídele al repartidor que no registre nada a tu nombre.
              </p>
              <label className="mt-3 block">
                <span className="text-xs font-medium text-ink">Tu teléfono</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5512 3456"
                  className="mt-1 w-full rounded-xl border border-line bg-app px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </label>
              {error ? <p className="mt-2 text-xs font-medium text-danger">{error}</p> : null}
              <button
                type="button"
                disabled={submitting}
                onClick={confirmReceived}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 text-[15px] font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? "Registrando…" : "Sí, recibí mi pedido"}
              </button>
            </div>
          </>
        ) : actionable ? (
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm font-semibold text-ink">Confirmar entrega</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Escribe tu teléfono tal como lo registró el negocio. La entrega queda a tu nombre.
            </p>
            <label className="mt-3 block">
              <span className="text-xs font-medium text-ink">Tu teléfono</span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5512 3456"
                className="mt-1 w-full rounded-xl border border-line bg-app px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
            {error ? <p className="mt-2 text-xs font-medium text-danger">{error}</p> : null}
            <button
              type="button"
              disabled={submitting}
              onClick={confirm}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 text-[15px] font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "Registrando…" : "Confirmar entrega"}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-warning/30 bg-warning/[0.08] p-5 text-center">
            <p className="text-sm font-semibold text-ink">Este pedido no está listo para entregarse</p>
            <p className="mt-1 text-xs text-muted">Vuelve a intentarlo cuando el mostrador lo confirme.</p>
          </div>
        )}

        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Cliente</h2>
          <p className="mt-1 text-sm text-ink">{delivery.customerName}</p>
          <p className="text-sm text-muted">{delivery.customerPhone}</p>
          {delivery.addressLine ? <p className="mt-2 text-sm text-muted">{delivery.addressLine}</p> : null}
          {delivery.addressReferences ? (
            <p className="text-sm text-muted">{delivery.addressReferences}</p>
          ) : null}

          <h2 className="mt-4 text-sm font-semibold text-ink">Pedido</h2>
          <ul className="mt-2 overflow-hidden rounded-xl border border-line">
            {delivery.items.map((item, index) => (
              <li
                key={index}
                className={`flex items-center justify-between px-3 py-2.5 text-sm ${
                  index > 0 ? "border-t border-line" : ""
                }`}
              >
                <span className="text-ink">
                  {formatQuantity(item.quantity, item.unit)} — {item.name}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex justify-between text-sm">
            <span className="text-muted">Total estimado</span>
            <span className="font-semibold text-ink">{quetzales.format(delivery.estimatedTotal)}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
