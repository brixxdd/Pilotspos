import { productImportRowSchema, type ProductImportRow } from "@pilotspos/validation";

/**
 * Normaliza un encabezado de columna: minúsculas, sin acentos ni espacios.
 * "Precio", "PRECIO " y "Código" caen todos al mismo token.
 */
export function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** Encabezados tolerados, mapeados al campo del schema de producto. */
const FIELD_BY_HEADER: Record<string, keyof ProductImportRow> = {
  nombre: "name",
  name: "name",
  producto: "name",
  product: "name",
  sku: "sku",
  codigo: "sku",
  code: "sku",
  precio: "price",
  price: "price",
  costo: "cost",
  cost: "cost",
  categoria: "categoryName",
  category: "categoryName",
  unidad: "unit",
  unit: "unit",
  stock: "stock",
  existencia: "stock",
  minimo: "minimumStock",
  minimostock: "minimumStock",
  minstock: "minimumStock",
  codigos: "barcodes",
  codigobarras: "barcodes",
  barcodes: "barcodes",
  barcode: "barcodes",
};

export function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  // "52.50", "52,50", "52 50" → 52.50. La hoja legacy puede venir con comas.
  const normalized = String(value).trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toUnit(value: unknown): "UNIT" | "LB" | undefined {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return undefined;
  if (["LB", "LBS", "LIBRA", "LIBRAS", "L"].includes(raw)) return "LB";
  return "UNIT";
}

export function parseBarcodes(value: unknown): string[] | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  return raw
    .split(/[\s,;|/]+/)
    .map((code) => code.trim())
    .filter(Boolean);
}

/** Convierte una fila cruda (objeto encabezado→valor) a la forma del schema. */
export function mapRowToInput(raw: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [header, value] of Object.entries(raw)) {
    const field = FIELD_BY_HEADER[normalizeHeader(header)];
    if (!field) continue;

    if (field === "price" || field === "cost" || field === "stock" || field === "minimumStock") {
      const number = toNumber(value);
      if (number !== undefined) output[field] = number;
    } else if (field === "unit") {
      const unit = toUnit(value);
      if (unit) output[field] = unit;
    } else if (field === "barcodes") {
      const barcodes = parseBarcodes(value);
      if (barcodes && barcodes.length > 0) output[field] = barcodes;
    } else {
      const text = String(value ?? "").trim();
      if (text) output[field] = text;
    }
  }
  return output;
}

export interface ParsedRow {
  row: number;
  value?: ProductImportRow;
  error?: string;
}

/** Nombres de campo → etiqueta legible para los reportes de error. */
const FIELD_LABELS: Record<string, string> = {
  name: "nombre",
  sku: "sku",
  price: "precio",
  cost: "costo",
  stock: "stock",
  minimumStock: "mínimo",
  unit: "unidad",
  categoryName: "categoría",
  barcodes: "códigos de barras",
};

/**
 * Valida una fila cruda contra el mismo schema del alta manual y devuelve el
 * primer error si no pasa. `row` es el número de fila de la hoja (para el
 * reporte: "fila 12: el precio no puede ser negativo").
 */
export function parseProductRow(raw: Record<string, unknown>, rowNumber: number): ParsedRow {
  const mapped = mapRowToInput(raw);
  const parsed = productImportRowSchema.safeParse(mapped);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    const rawPath = first?.path.map(String).join(".");
    const label = rawPath ? (FIELD_LABELS[rawPath] ?? rawPath) : "fila";
    return { row: rowNumber, error: `${label}: ${first?.message ?? "fila inválida"}` };
  }
  return { row: rowNumber, value: parsed.data };
}
