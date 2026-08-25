export interface InventoryProductRow {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minimumStock: number;
  categoryName: string | null;
}

export interface MovementRow {
  id: string;
  productId: string;
  productName: string;
  type: string;
  quantity: number;
  reference: string | null;
  note: string | null;
  createdAt: string;
  userName: string;
}
