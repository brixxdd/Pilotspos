"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { driverCreateSchema, type DriverCreateInput } from "@pilotspos/validation";
import type { Driver } from "@pilotspos/types";
import { Alert, Badge, Button, DataTable, Input, Modal, PageHeader } from "@pilotspos/ui";
import { apiFetch, ApiClientError } from "@/lib/api-client";

export function DriversClient({ initialDrivers }: { initialDrivers: Driver[] }) {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [modalOpen, setModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DriverCreateInput>({
    resolver: zodResolver(driverCreateSchema),
  });

  async function onSubmit(values: DriverCreateInput) {
    setServerError(null);
    try {
      const { driver } = await apiFetch<{ driver: Driver }>("/drivers", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setDrivers((prev) => [...prev, driver].sort((a, b) => a.name.localeCompare(b.name)));
      setModalOpen(false);
      reset();
    } catch (error) {
      setServerError(error instanceof ApiClientError ? error.message : "No se pudo crear el repartidor");
    }
  }

  async function toggleActive(driver: Driver) {
    try {
      const { driver: updated } = await apiFetch<{ driver: Driver }>(`/drivers/${driver.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !driver.active }),
      });
      setDrivers((prev) => prev.map((d) => (d.id === driver.id ? updated : d)));
    } catch (error) {
      alert(error instanceof ApiClientError ? error.message : "No se pudo actualizar");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Repartidores"
        description="Quiénes llevan los pedidos a domicilio. Solo un repartidor activo puede confirmar una entrega con su teléfono desde el QR del ticket."
        actions={<Button onClick={() => setModalOpen(true)}>Nuevo repartidor</Button>}
      />

      <DataTable
        columns={[
          { key: "name", header: "Nombre", render: (d) => d.name },
          { key: "phone", header: "Teléfono", render: (d) => d.phone },
          {
            key: "active",
            header: "Estado",
            render: (d) => (
              <Badge tone={d.active ? "success" : "neutral"}>{d.active ? "Activo" : "Inactivo"}</Badge>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (d) => (
              <Button variant="ghost" size="sm" onClick={() => toggleActive(d)}>
                {d.active ? "Desactivar" : "Activar"}
              </Button>
            ),
          },
        ]}
        rows={drivers}
        rowKey={(d) => d.id}
        emptyTitle="No hay repartidores registrados"
        emptyDescription="Agrega a las personas que reparten los pedidos del menú."
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo repartidor">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError ? <Alert tone="danger">{serverError}</Alert> : null}
          <Input label="Nombre" {...register("name")} error={errors.name?.message} />
          <Input
            label="Teléfono"
            type="tel"
            inputMode="numeric"
            placeholder="5512 3456"
            {...register("phone")}
            error={errors.phone?.message}
          />
          <Input
            label="PIN del portal"
            type="password"
            inputMode="numeric"
            placeholder="4 dígitos"
            {...register("pin")}
            error={errors.pin?.message}
          />
          <p className="text-xs text-muted">
            El repartidor confirma la entrega con su teléfono en el QR, y entra a su portal en{" "}
            <span className="font-mono">/r</span> con este teléfono y el PIN.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
