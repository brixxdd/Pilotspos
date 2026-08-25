export interface CategoryRow {
  id: string;
  name: string;
}

export interface ProductBarcodeRow {
  id: string;
  barcode: string;
}

export interface ProductRow {
  id: string;
  name: string;
  sku: string;
  price: string;
  cost: string;
  unit: "UNIT" | "LB";
  stock: number;
  minimumStock: number;
  categoryId: string | null;
  categoryName: string | null;
  active: boolean;
  barcodes: ProductBarcodeRow[];
}
