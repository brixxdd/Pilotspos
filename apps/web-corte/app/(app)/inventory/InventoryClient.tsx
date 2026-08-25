"use client";

import { useState } from "react";
import type { UserRole } from "@pilotspos/types";
import { Badge, Button, Card, DataTable, PageHeader, SearchInput } from "@pilotspos/ui";
import { apiFetch } from "@/lib/api-client";
import { ReceiveModal } from "./ReceiveModal";
import { AdjustModal } from "./AdjustModal";
import type { InventoryProductRow, MovementRow } from "./types";

const MOVEMENT_LABELS: Record<string, string> = {
  SALE: "Venta",
  PURCHASE: "Recepción",
  ADJUSTMENT_IN: "Ajuste (entrada)",
  ADJUSTMENT_OUT: "Ajuste (salida)",
  RETURN: "Devolución",
  INITIAL_STOCK: "Stock inicial",
};

export function InventoryClient({
  initialItems,
  initialMovements,
  role,
}: {
  initialItems: InventoryProductRow[];
  initialMovements: MovementRow[];
  role: UserRole;
}) {
  const canManage = role === "ADMIN" || role === "MANAGER";

  const [items, setItems] = useState(initialItems);
  const [movements, setMovements] = useState(initialMovements);
  const [search, setSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<InventoryProductRow | null>(null);

  async function refresh() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (onlyLowStock) params.set("onlyLowStock", "true");
    const { items: newItems } = await apiFetch<{ items: InventoryProductRow[] }>(
      `/inventory?${params.toString()}`,
    );
    setItems(newItems);
    const { items: newMovements } = await apiFetch<{ items: MovementRow[] }>("/inventory/movements");
    setMovements(newMovements);
  }

  const filtered = items.filter((item) => {
    if (onlyLowStock && item.stock > item.minimumStock) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.sku.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventario"
        description="Stock actual, recepción de mercancía y ajustes."
        actions={
          canManage ? (
            <Button onClick={() => setReceiveOpen(true)}>Nueva recepción</Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-3">
        <SearchInput
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={onlyLowStock}
            onChange={(e) => setOnlyLowStock(e.target.checked)}
          />
          Solo stock bajo
        </label>
      </div>

      <DataTable
        columns={[
          {
            key: "name",
            header: "Producto",
            render: (p) => (
              <div>
                <p className="font-medium text-ink">{p.name}</p>
                <p className="text-xs text-muted">{p.sku}</p>
              </div>
            ),
          },
          { key: "category", header: "Categoría", render: (p) => p.categoryName ?? "—" },
          {
            key: "stock",
            header: "Stock",
            render: (p) => (
              <div className="flex items-center gap-2">
                <span>{p.stock}</span>
                {p.stock <= p.minimumStock ? <Badge tone="warning">Bajo (mín. {p.minimumStock})</Badge> : null}
              </div>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (p) =>
              canManage ? (
                <Button variant="ghost" size="sm" onClick={() => setAdjustProduct(p)}>
                  Ajustar
                </Button>
              ) : null,
          },
        ]}
        rows={filtered}
        rowKey={(p) => p.id}
        emptyTitle="No hay productos que coincidan"
      />

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">Movimientos recientes</h2>
        <DataTable
          columns={[
            { key: "date", header: "Fecha", render: (m) => new Date(m.createdAt).toLocaleString("es-MX") },
            { key: "product", header: "Producto", render: (m) => m.productName },
            { key: "type", header: "Tipo", render: (m) => MOVEMENT_LABELS[m.type] ?? m.type },
            {
              key: "quantity",
              header: "Cantidad",
              render: (m) => (
                <span className={m.type === "SALE" || m.type === "ADJUSTMENT_OUT" ? "text-danger" : "text-success"}>
                  {m.type === "SALE" || m.type === "ADJUSTMENT_OUT" ? "-" : "+"}
                  {m.quantity}
                </span>
              ),
            },
            { key: "user", header: "Usuario", render: (m) => m.userName },
          ]}
          rows={movements}
          rowKey={(m) => m.id}
          emptyTitle="Aún no hay movimientos registrados"
        />
      </Card>

      <ReceiveModal open={receiveOpen} onClose={() => setReceiveOpen(false)} onReceived={refresh} />
      <AdjustModal product={adjustProduct} onClose={() => setAdjustProduct(null)} onAdjusted={refresh} />
    </div>
  );
}
