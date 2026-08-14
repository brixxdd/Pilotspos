"use client";

import { useState } from "react";
import { Alert, Button, Input, Modal, Select } from "@pilotspos/ui";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { InventoryProductRow } from "./types";

export function AdjustModal({
  product,
  onClose,
  onAdjusted,
}: {
  product: InventoryProductRow | null;
  onClose: () => void;
  onAdjusted: () => void;
}) {
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!product) return;
    setSubmitting(true);
    setError(null);
    try {
      const signedQuantity = direction === "in" ? Math.abs(quantity) : -Math.abs(quantity);
      await apiFetch("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, quantity: signedQuantity, note: note || undefined }),
      });
      setQuantity(1);
      setNote("");
      onAdjusted();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo registrar el ajuste");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={Boolean(product)} onClose={onClose} title={`Ajustar stock — ${product?.name ?? ""}`}>
      <div className="flex flex-col gap-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {product ? <p className="text-sm text-muted">Stock actual: {product.stock}</p> : null}

        <Select
          label="Tipo de ajuste"
          value={direction}
          onChange={(e) => setDirection(e.target.value as "in" | "out")}
          options={[
            { value: "in", label: "Entrada (aumentar stock)" },
            { value: "out", label: "Salida (disminuir stock)" },
          ]}
        />
        <Input
          label="Cantidad"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
        <Input label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} loading={submitting}>
            Registrar ajuste
          </Button>
        </div>
      </div>
    </Modal>
  );
}
