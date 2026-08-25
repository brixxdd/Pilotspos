"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productCreateSchema, type ProductCreateInput } from "@pilotspos/validation";
import { Alert, Badge, Button, Input, Select } from "@pilotspos/ui";
import type { CategoryRow } from "./types";

export function ProductForm({
  categories,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Guardar",
}: {
  categories: CategoryRow[];
  defaultValues?: Partial<ProductCreateInput>;
  onSubmit: (values: ProductCreateInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductCreateInput>({
    resolver: zodResolver(productCreateSchema),
    defaultValues: {
      active: true,
      unit: "UNIT",
      stock: 0,
      minimumStock: 0,
      cost: 0,
      barcodes: [],
      ...defaultValues,
    },
  });

  const barcodes = watch("barcodes") ?? [];

  function addBarcode() {
    const value = barcodeInput.trim();
    if (!value) return;
    if (!barcodes.includes(value)) {
      setValue("barcodes", [...barcodes, value]);
    }
    setBarcodeInput("");
  }

  function removeBarcode(value: string) {
    setValue(
      "barcodes",
      barcodes.filter((b) => b !== value),
    );
  }

  // Las etiquetas y el paso de los campos cambian según se venda por peso.
  const isWeighed = watch("unit") === "LB";

  async function handleFormSubmit(values: ProductCreateInput) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No se pudo guardar el producto");
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
      {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

      <div>
        <label className="text-sm font-medium text-ink">Códigos de barras</label>
        <div className="mt-1.5 flex gap-2">
          <Input
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addBarcode();
              }
            }}
            placeholder="Escanea o escribe un código y presiona Enter"
            className="flex-1"
          />
          <Button type="button" variant="secondary" onClick={addBarcode}>
            Agregar
          </Button>
        </div>
        {barcodes.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {barcodes.map((code) => (
              <button key={code} type="button" onClick={() => removeBarcode(code)} title="Quitar">
                <Badge tone="info">{code} ✕</Badge>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Input label="Nombre" {...register("name")} error={errors.name?.message} />
      <Input label="SKU" {...register("sku")} error={errors.sku?.message} />

      <Select
        label="Unidad de venta"
        options={[
          { value: "UNIT", label: "Por pieza" },
          { value: "LB", label: "Por libra (peso)" },
        ]}
        {...register("unit")}
        error={errors.unit?.message}
      />

      <Select
        label="Categoría"
        placeholder="Sin categoría"
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        {...register("categoryId")}
        error={errors.categoryId?.message}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={isWeighed ? "Precio por libra" : "Precio por pieza"}
          type="number"
          step="0.01"
          {...register("price", { valueAsNumber: true })}
          error={errors.price?.message}
        />
        <Input
          label="Costo"
          type="number"
          step="0.01"
          {...register("cost", { valueAsNumber: true })}
          error={errors.cost?.message}
        />
        <Input
          label={isWeighed ? "Existencia inicial (lb)" : "Existencia inicial"}
          type="number"
          step={isWeighed ? "0.001" : "1"}
          {...register("stock", { valueAsNumber: true })}
          error={errors.stock?.message}
        />
        <Input
          label={isWeighed ? "Existencia mínima (lb)" : "Existencia mínima"}
          type="number"
          step={isWeighed ? "0.001" : "1"}
          {...register("minimumStock", { valueAsNumber: true })}
          error={errors.minimumStock?.message}
        />
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
