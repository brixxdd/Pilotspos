"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductCreateInput } from "@pilotspos/validation";
import type { UserRole } from "@pilotspos/types";
import { Badge, Button, DataTable, Modal, PageHeader, SearchInput } from "@pilotspos/ui";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { ProductForm } from "./ProductForm";
import { ImportModal } from "./ImportModal";
import type { CategoryRow, ProductRow } from "./types";

export function ProductsClient({
  initialProducts,
  categories,
  role,
}: {
  initialProducts: ProductRow[];
  categories: CategoryRow[];
  role: UserRole;
}) {
  const canManage = role === "ADMIN" || role === "MANAGER";
  const canDelete = role === "ADMIN";

  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<{ open: boolean; editing: ProductRow | null }>({
    open: false,
    editing: null,
  });
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const query = search ? `?search=${encodeURIComponent(search)}` : "";
        const { items } = await apiFetch<{ items: ProductRow[] }>(`/products${query}`);
        setProducts(items);
      } catch {
        // el estado anterior se conserva si falla la búsqueda
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const editingDefaults = useMemo(() => {
    const p = modalState.editing;
    if (!p) return undefined;
    return {
      name: p.name,
      sku: p.sku,
      price: Number(p.price),
      cost: Number(p.cost),
      stock: p.stock,
      minimumStock: p.minimumStock,
      categoryId: p.categoryId,
      barcodes: p.barcodes.map((b) => b.barcode),
      active: p.active,
    } satisfies Partial<ProductCreateInput>;
  }, [modalState.editing]);

  async function handleCreate(values: ProductCreateInput) {
    const { product } = await apiFetch<{ product: ProductRow }>("/products", {
      method: "POST",
      body: JSON.stringify(values),
    });
    setProducts((prev) => [...prev, product].sort((a, b) => a.name.localeCompare(b.name)));
    setModalState({ open: false, editing: null });
  }

  async function handleUpdate(values: ProductCreateInput) {
    if (!modalState.editing) return;
    const { product } = await apiFetch<{ product: ProductRow }>(`/products/${modalState.editing.id}`, {
      method: "PATCH",
      body: JSON.stringify(values),
    });
    setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
    setModalState({ open: false, editing: null });
  }

  async function reloadCatalog() {
    try {
      const { items } = await apiFetch<{ items: ProductRow[] }>(`/products?pageSize=100`);
      setProducts(items);
    } catch {
      // la lista se refresca con la siguiente búsqueda
    }
  }

  async function handleDeactivate(product: ProductRow) {
    if (!confirm(`¿Desactivar "${product.name}"?`)) return;
    try {
      await apiFetch(`/products/${product.id}`, { method: "DELETE" });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: false } : p)));
    } catch (error) {
      alert(error instanceof ApiClientError ? error.message : "No se pudo desactivar el producto");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Productos"
        description="Catálogo de productos, precios, stock y códigos de barras."
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                Importar
              </Button>
              <Button onClick={() => setModalState({ open: true, editing: null })}>Nuevo producto</Button>
            </div>
          ) : undefined
        }
      />

      <SearchInput
        placeholder="Buscar por nombre, SKU o código de barras..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <DataTable
        loading={loading && products.length === 0}
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
          { key: "price", header: "Precio", render: (p) => `$${Number(p.price).toFixed(2)}` },
          {
            key: "stock",
            header: "Stock",
            render: (p) => (
              <div className="flex items-center gap-2">
                <span>{p.stock}</span>
                {p.stock <= p.minimumStock ? <Badge tone="warning">Bajo</Badge> : null}
              </div>
            ),
          },
          {
            key: "active",
            header: "Estado",
            render: (p) => <Badge tone={p.active ? "success" : "neutral"}>{p.active ? "Activo" : "Inactivo"}</Badge>,
          },
          {
            key: "actions",
            header: "",
            className: "text-right whitespace-nowrap",
            render: (p) =>
              canManage ? (
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setModalState({ open: true, editing: p })}>
                    Editar
                  </Button>
                  {canDelete && p.active ? (
                    <Button variant="ghost" size="sm" onClick={() => handleDeactivate(p)}>
                      Desactivar
                    </Button>
                  ) : null}
                </div>
              ) : null,
          },
        ]}
        rows={products}
        rowKey={(p) => p.id}
        emptyTitle="No hay productos registrados"
        emptyDescription="Agrega tu primer producto para comenzar a vender."
      />

      <Modal
        open={modalState.open}
        onClose={() => setModalState({ open: false, editing: null })}
        title={modalState.editing ? "Editar producto" : "Nuevo producto"}
        size="lg"
      >
        <ProductForm
          categories={categories}
          defaultValues={editingDefaults}
          onSubmit={modalState.editing ? handleUpdate : handleCreate}
          onCancel={() => setModalState({ open: false, editing: null })}
          submitLabel={modalState.editing ? "Guardar cambios" : "Crear producto"}
        />
      </Modal>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={reloadCatalog}
      />
    </div>
  );
}
