"use client";

import { useState } from "react";
import { Alert, Button, Input, Modal, Select } from "@pilotspos/ui";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { CashSummary } from "./types";

export function MovementModal({
  open,
  onClose,
  onRegistered,
}: {
  open: boolean;
  onClose: () => void;
  onRegistered: (summary: CashSummary) => void;
}) {
  const [type, setType] = useState<"WITHDRAWAL" | "DEPOSIT">("WITHDRAWAL");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const { summary } = await apiFetch<{ summary: CashSummary }>("/cash/movement", {
        method: "POST",
        body: JSON.stringify({ type, amount, note: note || undefined }),
      });
      onRegistered(summary);
      setAmount(0);
      setNote("");
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo registrar el movimiento");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Movimiento de caja">
      <div className="flex flex-col gap-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Select
          label="Tipo"
          value={type}
          onChange={(e) => setType(e.target.value as "WITHDRAWAL" | "DEPOSIT")}
          options={[
            { value: "WITHDRAWAL", label: "Retiro" },
            { value: "DEPOSIT", label: "Entrada" },
          ]}
        />
        <Input
          label="Monto"
          type="number"
          step="0.01"
          min={0}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <Input label="Nota" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} loading={submitting} disabled={amount <= 0}>
            Registrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
