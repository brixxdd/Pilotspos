"use client";

import { useEffect, useRef, useState } from "react";
import type { CustomerListItem } from "@pilotspos/types";
import { Badge, Button, DataTable, Input, Modal, PageHeader, SearchInput } from "@pilotspos/ui";
import { apiFetch, ApiClientError } from "@/lib/api-client";

interface ListResponse {
  items: CustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
}

function formatQ(value: number): string {
  return value.toLocaleString("es-GT", { style: "currency", currency: "GTQ" });
}

export function ClientsClient({
  initialCustomers,
  canManage,
}: {
  initialCustomers: CustomerListItem[];
  canManage: boolean;
}) {
  const [customers, setCustomers] = useState<CustomerListItem[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CustomerListItem | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const [creditLimit, setCreditLimit] = useState("");
  const [payment, setPayment] = useState("");
  const [saving, setSaving] = useState(false);

  // Debounce de la búsqueda: el mostrador teclea mientras atiende y no debe
  // pegarle a la API en cada tecla.
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const q = search.trim();
      setLoading(true);
      apiFetch<ListResponse>(`/customers?search=${encodeURIComponent(q)}&pageSize=100`)
        .then((response) => setCustomers(response.items))
        .catch(() => setCustomers([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [search]);

  function openCredit(customer: CustomerListItem) {
    setSelected(customer);
    setCreditLimit(String(customer.creditLimit));
    setPayment("");
    setServerError(null);
  }

  async function saveCredit() {
    if (!selected) return;
    setSaving(true);
    setServerError(null);
    const body: Record<string, number> = {};
    const parsedLimit = Number(creditLimit);
    const parsedPayment = Number(payment);

    if (Number.isFinite(parsedLimit)) body.creditLimit = parsedLimit;
    if (Number.isFinite(parsedPayment) && parsedPayment > 0) {
      body.balanceAdjustment = -parsedPayment;
    }

    try {
      const { customer } = await apiFetch<{ customer: CustomerListItem }>(
        `/customers/${selected.id}/credit`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, ...customer } : c)).sort((a, b) => a.fullName.localeCompare(b.fullName)),
      );
      setSelected(customer);
    } catch (error) {
      setServerError(error instanceof ApiClientError ? error.message : "No se pudo guardar el crédito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description="Los clientes del negocio y su fiado. El crédito lo autoriza el mostrador."
      />

      <div className="max-w-md">
        <SearchInput
          placeholder="Buscar por nombre o teléfono…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <DataTable
        columns={[
          {
            key: "name",
            header: "Cliente",
            render: (c) => (
              <div>
                <p className="font-medium text-ink">{c.fullName}</p>
                <p className="text-xs text-muted">{c.phone}</p>
              </div>
            ),
          },
          {
            key: "credit",
            header: "Fiado",
            render: (c) => (
              <div className="text-sm">
                <p className="tabular-nums text-ink">
                  Debe <span className="font-semibold">{formatQ(c.balance)}</span>
                </p>
                <p className="text-xs text-muted">
                  de {formatQ(c.creditLimit)} · disponible {formatQ(c.availableCredit)}
                </p>
              </div>
            ),
          },
          {
            key: "status",
            header: "Estado",
            render: (c) => (
              <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Activo" : "Inactivo"}</Badge>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (c) =>
              canManage ? (
                <Button variant="ghost" size="sm" onClick={() => openCredit(c)}>
                  Crédito
                </Button>
              ) : null,
          },
        ]}
        rows={customers}
        rowKey={(c) => c.id}
        loading={loading}
        emptyTitle="No se encontraron clientes"
        emptyDescription="Busca por nombre o teléfono, o prueba con otra búsqueda."
      />

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={`Crédito de ${selected?.fullName ?? ""}`}
        size="sm"
      >
        {selected ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveCredit();
            }}
          >
            {serverError ? <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{serverError}</p> : null}

            <div className="rounded-md border border-line bg-app p-3 text-sm">
              <p className="flex justify-between text-muted">
                <span>Debe hoy</span>
                <span className="tabular-nums font-semibold text-ink">{formatQ(selected.balance)}</span>
              </p>
              <p className="mt-1 flex justify-between text-muted">
                <span>Límite actual</span>
                <span className="tabular-nums font-semibold text-ink">{formatQ(selected.creditLimit)}</span>
              </p>
              <p className="mt-1 flex justify-between text-muted">
                <span>Disponible</span>
                <span className="tabular-nums font-semibold text-accent">{formatQ(selected.availableCredit)}</span>
              </p>
            </div>

            <Input
              label="Nuevo límite de crédito (Q)"
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              value={creditLimit}
              onChange={(event) => setCreditLimit(event.target.value)}
            />

            <Input
              label="Abono del cliente (Q)"
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              placeholder="0.00"
              hint="Reduce la deuda; nunca la deja en negativo."
              value={payment}
              onChange={(event) => setPayment(event.target.value)}
            />

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
                Cerrar
              </Button>
              <Button type="submit" loading={saving}>
                Guardar
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
