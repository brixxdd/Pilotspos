"use client";

import { useCallback, useState } from "react";
import * as XLSX from "xlsx";
import { Alert, Button, Modal } from "@pilotspos/ui";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { parseProductRow } from "@/lib/product-import";
import type { ProductImportRow } from "@pilotspos/validation";

interface ImportResult {
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

export function ImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ProductImportRow[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFileName(null);
    setRows([]);
    setErrors([]);
    setResult(null);
    setFileError(null);
  }, []);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      // SheetJS lee tanto .xlsx como .xls y .csv con el mismo `read`.
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("La hoja está vacía");
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) throw new Error("La hoja está vacía");

      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (raw.length === 0) throw new Error("No se encontraron filas con datos");

      const parsed = raw.map((row, index) => parseProductRow(row, index + 2));
      setRows(parsed.flatMap((entry) => (entry.value ? [entry.value] : [])));
      setErrors(parsed.flatMap((entry) => (entry.error ? [{ row: entry.row, error: entry.error }] : [])));
      setFileName(file.name);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "No se pudo leer el archivo");
      setRows([]);
      setErrors([]);
    }
  }

  async function submit() {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const response = await apiFetch<ImportResult>("/products/import", {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      setResult(response);
      if (response.imported > 0) onImported();
    } catch (error) {
      setFileError(error instanceof ApiClientError ? error.message : "No se pudo importar el catálogo");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Importar productos" size="lg">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Sube un <strong>.xlsx</strong>, <strong>.xls</strong> o <strong>.csv</strong> exportado de tu sistema.
          Reconoce columnas como{" "}
          <span className="rounded bg-app px-1.5 py-0.5 font-mono text-xs">nombre</span>,{" "}
          <span className="rounded bg-app px-1.5 py-0.5 font-mono text-xs">sku</span>,{" "}
          <span className="rounded bg-app px-1.5 py-0.5 font-mono text-xs">precio</span>,{" "}
          <span className="rounded bg-app px-1.5 py-0.5 font-mono text-xs">costo</span>,{" "}
          <span className="rounded bg-app px-1.5 py-0.5 font-mono text-xs">categoría</span>,{" "}
          <span className="rounded bg-app px-1.5 py-0.5 font-mono text-xs">unidad</span> (lb o pieza),{" "}
          <span className="rounded bg-app px-1.5 py-0.5 font-mono text-xs">stock</span>,{" "}
          <span className="rounded bg-app px-1.5 py-0.5 font-mono text-xs">mínimo</span> y{" "}
          <span className="rounded bg-app px-1.5 py-0.5 font-mono text-xs">códigos</span> (varios separados por coma).
        </p>

        <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-line bg-app px-4 py-8 text-sm text-muted transition-colors hover:border-accent hover:text-accent">
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
          {fileName ?? "Elegir archivo…"}
        </label>

        {fileError ? <Alert tone="danger">{fileError}</Alert> : null}

        {fileName ? (
          <>
            <p className="text-sm">
              <strong>{rows.length}</strong> filas válidas{" "}
              {errors.length > 0 ? (
                <span className="text-danger">· {errors.length} con errores</span>
              ) : null}
            </p>

            {errors.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-md border border-line bg-app p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Las filas con error no se importan:</p>
                <ul className="space-y-1 text-xs">
                  {errors.slice(0, 30).map((error) => (
                    <li key={error.row} className="text-danger">
                      Fila {error.row}: {error.error}
                    </li>
                  ))}
                  {errors.length > 30 ? <li className="text-muted">… y {errors.length - 30} más</li> : null}
                </ul>
              </div>
            ) : null}

            {result ? (
              <Alert tone={result.imported > 0 ? "success" : "warning"} title="Resultado">
                Se importaron <strong>{result.imported}</strong> productos.
                {result.errors.length > 0 ? ` ${result.errors.length} filas se rechazaron:` : ""}
                {result.errors.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {result.errors.slice(0, 10).map((error, index) => (
                      <li key={index}>
                        Fila {error.row}: {error.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Alert>
            ) : null}

            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { reset(); onClose(); }}>
                Cerrar
              </Button>
              <Button onClick={submit} loading={importing} disabled={rows.length === 0}>
                Importar {rows.length > 0 ? `${rows.length} ` : ""}productos
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
