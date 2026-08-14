"use client";

import { useState } from "react";
import { Alert, Button, Card, Input, PageHeader, Select } from "@pilotspos/ui";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { MovementModal } from "./MovementModal";
import { CloseModal } from "./CloseModal";
import type { CashSessionRow, CashSummary, RegisterRow } from "./types";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`text-lg font-semibold ${tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}

export function CashClient({
  registers,
  initialSession,
  initialSummary,
}: {
  registers: RegisterRow[];
  initialSession: CashSessionRow | null;
  initialSummary: CashSummary | null;
}) {
  const [session, setSession] = useState(initialSession);
  const [summary, setSummary] = useState(initialSummary);
  const [registerId, setRegisterId] = useState(registers[0]?.id ?? "");
  const [openingAmount, setOpeningAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  async function handleOpen() {
    setOpening(true);
    setError(null);
    try {
      const result = await apiFetch<{ session: CashSessionRow; summary: CashSummary }>("/cash/open", {
        method: "POST",
        body: JSON.stringify({ registerId, openingAmount }),
      });
      setSession(result.session);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo abrir la caja");
    } finally {
      setOpening(false);
    }
  }

  if (!session || !summary) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Caja" description="Abre tu turno para comenzar a operar." />
        <Card className="max-w-sm">
          {error ? (
            <div className="mb-4">
              <Alert tone="danger">{error}</Alert>
            </div>
          ) : null}
          {registers.length === 0 ? (
            <Alert tone="warning">No hay cajas registradas en tu sucursal.</Alert>
          ) : (
            <div className="flex flex-col gap-4">
              <Select
                label="Caja"
                value={registerId}
                onChange={(e) => setRegisterId(e.target.value)}
                options={registers.map((r) => ({ value: r.id, label: r.name }))}
              />
              <Input
                label="Fondo inicial"
                type="number"
                step="0.01"
                min={0}
                value={openingAmount}
                onChange={(e) => setOpeningAmount(Number(e.target.value))}
              />
              <Button onClick={handleOpen} loading={opening}>
                Abrir caja
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const register = registers.find((r) => r.id === session.registerId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Caja"
        description={`${register?.name ?? "Caja"} · abierta ${new Date(session.openedAt).toLocaleString("es-MX")}`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setMovementOpen(true)}>
              Retiro / Entrada
            </Button>
            <Button variant="danger" onClick={() => setCloseOpen(true)}>
              Cerrar caja
            </Button>
          </div>
        }
      />

      <Card>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Fondo inicial" value={`$${summary.openingAmount.toFixed(2)}`} />
          <Stat label="Ventas efectivo" value={`$${summary.cashSales.toFixed(2)}`} />
          <Stat label="Ventas tarjeta" value={`$${summary.cardSales.toFixed(2)}`} />
          <Stat label="Transferencias" value={`$${summary.transferSales.toFixed(2)}`} />
          <Stat label="Entradas" value={`$${summary.deposits.toFixed(2)}`} tone="success" />
          <Stat label="Retiros" value={`$${summary.withdrawals.toFixed(2)}`} tone="danger" />
          <Stat label="Efectivo esperado" value={`$${summary.expectedCash.toFixed(2)}`} />
        </div>
      </Card>

      <MovementModal open={movementOpen} onClose={() => setMovementOpen(false)} onRegistered={setSummary} />
      <CloseModal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        expectedCash={summary.expectedCash}
        onClosed={() => {
          setSession(null);
          setSummary(null);
        }}
      />
    </div>
  );
}
