"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Input, Modal } from "@pilotspos/ui";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { CashSummary } from "./types";

export function CloseModal({
  open,
  onClose,
  expectedCash,
  onClosed,
}: {
  open: boolean;
  onClose: () => void;
  expectedCash: number;
  onClosed: (summary: CashSummary) => void;
}) {
  const [countedCash, setCountedCash] = useState(expectedCash);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const difference = useMemo(() => Math.round((countedCash - expectedCash) * 100) / 100, [countedCash, expectedCash]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const { summary } = await apiFetch<{ summary: CashSummary }>("/cash/close", {
        method: "POST",
        body: JSON.stringify({ countedCash, note: note || undefined }),
      });
      onClosed(summary);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo cerrar la caja");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Corte de caja">
      <div className="flex flex-col gap-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <div className="flex justify-between text-sm">
          <span className="text-muted">Efectivo esperado</span>
          <span className="font-medium text-ink">${expectedCash.toFixed(2)}</span>
        </div>
        <Input
          label="Efectivo contado"
          type="number"
          step="0.01"
          value={countedCash}
          onChange={(e) => setCountedCash(Number(e.target.value))}
        />
        <div className="flex justify-between text-sm">
          <span className="text-muted">Diferencia</span>
          <span className={difference === 0 ? "text-ink" : difference > 0 ? "text-success" : "text-danger"}>
            {difference > 0 ? "+" : ""}
            ${difference.toFixed(2)}
          </span>
        </div>
        {difference !== 0 ? (
          <Input
            label="Nota (requerida por la diferencia)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        ) : null}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" onClick={handleSubmit} loading={submitting}>
            Cerrar turno
          </Button>
        </div>
      </div>
    </Modal>
  );
}
