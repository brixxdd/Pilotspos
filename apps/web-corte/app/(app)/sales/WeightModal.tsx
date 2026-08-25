"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input, Modal } from "@pilotspos/ui";

/**
 * Captura el peso de un producto que se vende por libra.
 *
 * En el mostrador el cajero pone el corte en la báscula, lee el peso y lo
 * teclea aquí: 3.250 lb. No tiene sentido "sumar de uno en uno" como con un
 * producto empacado — la cantidad la decide la báscula, no el número de toques.
 */
export function WeightModal({
  open,
  product,
  onClose,
  onConfirm,
}: {
  open: boolean;
  product: { name: string; unitPrice: number; stock: number } | null;
  onClose: () => void;
  onConfirm: (pounds: number) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Al abrir: campo vacío y con el foco puesto, para teclear el peso de inmediato.
  useEffect(() => {
    if (open) {
      setValue("");
      const id = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  if (!product) return null;

  const pounds = Number(value);
  const isValid = Number.isFinite(pounds) && pounds > 0;
  const exceedsStock = isValid && pounds > product.stock;
  const lineTotal = isValid ? Math.round(product.unitPrice * pounds * 100) / 100 : 0;

  function confirm() {
    if (!isValid || exceedsStock) return;
    // 3 decimales: es la precisión de numeric(12,3) en la base.
    onConfirm(Math.round(pounds * 1000) / 1000);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={product.name}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Q{product.unitPrice.toFixed(2)} por libra · quedan {product.stock.toFixed(3)} lb
        </p>

        <Input
          ref={inputRef}
          label="Peso en libras"
          type="number"
          step="0.001"
          min="0"
          inputMode="decimal"
          placeholder="0.000"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              confirm();
            }
          }}
          error={exceedsStock ? `Solo quedan ${product.stock.toFixed(3)} lb` : undefined}
        />

        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-sm text-muted">Total de la línea</span>
          <span className="text-2xl font-semibold text-ink">Q{lineTotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={!isValid || exceedsStock}>
            Agregar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
