"use client";

import { useState } from "react";
import { Alert, Badge, Button, Input, Modal } from "@pilotspos/ui";
import { apiFetch, ApiClientError } from "@/lib/api-client";

interface ReceiveLine {
  productId: string;
  name: string;
  quantity: number;
}

export function ReceiveModal({ open, onClose, onReceived }: { open: boolean; onClose: () => void; onReceived: () => void }) {
  const [barcode, setBarcode] = useState("");
  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleScan() {
    const code = barcode.trim();
    if (!code) return;
    setError(null);
    setLoading(true);
    try {
      const { product } = await apiFetch<{ product: { id: string; name: string } }>(
        `/products/barcode/${encodeURIComponent(code)}`,
      );
      setLines((prev) => {
        const existing = prev.find((l) => l.productId === product.id);
        if (existing) {
          return prev.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
        }
        return [...prev, { productId: product.id, name: product.name, quantity: 1 }];
      });
      setBarcode("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo identificar el producto");
    } finally {
      setLoading(false);
    }
  }

  function updateQuantity(productId: string, quantity: number) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.max(quantity, 1) } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  async function handleConfirm() {
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/inventory/receive", {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          reference: reference || undefined,
        }),
      });
      setLines([]);
      setReference("");
      onReceived();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo registrar la recepción");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva recepción de mercancía" size="lg">
      <div className="flex flex-col gap-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <div className="flex gap-2">
          <Input
            autoFocus
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleScan();
              }
            }}
            placeholder="Escanea el código de barras del producto"
            className="flex-1"
          />
          <Button type="button" variant="secondary" onClick={handleScan} loading={loading}>
            Buscar
          </Button>
        </div>

        {lines.length === 0 ? (
          <p className="text-sm text-muted">Escanea productos para agregarlos a la recepción.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {lines.map((line) => (
              <div key={line.productId} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                <span className="text-sm text-ink">{line.name}</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={line.quantity}
                    onChange={(e) => updateQuantity(line.productId, Number(e.target.value))}
                    className="w-20"
                  />
                  <button type="button" onClick={() => removeLine(line.productId)} className="text-muted hover:text-danger">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Input
          label="Referencia (folio de factura, opcional)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />

        {lines.length > 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Badge tone="info">{lines.reduce((sum, l) => sum + l.quantity, 0)} unidades</Badge>
            en {lines.length} producto(s)
          </div>
        ) : null}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} loading={submitting} disabled={lines.length === 0}>
            Confirmar recepción
          </Button>
        </div>
      </div>
    </Modal>
  );
}
