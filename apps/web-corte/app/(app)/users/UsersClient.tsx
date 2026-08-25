"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userCreateSchema, type UserCreateInput } from "@pilotspos/validation";
import type { UserRole } from "@pilotspos/types";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Input,
  Modal,
  PageHeader,
  Select,
} from "@pilotspos/ui";
import { apiFetch, ApiClientError } from "@/lib/api-client";

export interface UserRow {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
  active: boolean;
}

export interface BranchOption {
  id: string;
  name: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  MANAGER: "Encargado",
  CASHIER: "Cajero",
};

export function UsersClient({
  initialUsers,
  branches,
}: {
  initialUsers: UserRow[];
  branches: BranchOption[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [modalOpen, setModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateInput>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { role: "CASHIER" },
  });

  // Un cajero o encargado sin sucursal vería las cajas y el inventario de
  // TODAS las sucursales — exactamente lo que hay que evitar para que no se
  // crucen entre Las Minas y La Hermita.
  const selectedRole = watch("role");
  const needsBranch = selectedRole === "CASHIER" || selectedRole === "MANAGER";

  async function onSubmit(values: UserCreateInput) {
    setServerError(null);
    try {
      const { user } = await apiFetch<{ user: UserRow }>("/users", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setUsers((prev) => [...prev, user].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      setModalOpen(false);
      reset();
    } catch (error) {
      setServerError(error instanceof ApiClientError ? error.message : "No se pudo crear el usuario");
    }
  }

  async function toggleActive(user: UserRow) {
    if (user.active) {
      if (!confirm(`¿Desactivar a ${user.fullName}?`)) return;
      try {
        await apiFetch(`/users/${user.id}`, { method: "DELETE" });
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, active: false } : u)));
      } catch (error) {
        alert(error instanceof ApiClientError ? error.message : "No se pudo desactivar");
      }
    } else {
      try {
        const { user: updated } = await apiFetch<{ user: UserRow }>(`/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: true }),
        });
        setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      } catch (error) {
        alert(error instanceof ApiClientError ? error.message : "No se pudo activar");
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuarios"
        description="Administra los cajeros, encargados y administradores de tu organización."
        actions={<Button onClick={() => setModalOpen(true)}>Nuevo usuario</Button>}
      />

      <DataTable
        columns={[
          { key: "fullName", header: "Nombre", render: (u) => u.fullName },
          { key: "username", header: "Usuario", render: (u) => u.username },
          { key: "role", header: "Rol", render: (u) => ROLE_LABELS[u.role] },
          {
            key: "branch",
            header: "Sucursal",
            render: (u) => u.branchName ?? "—",
          },
          {
            key: "active",
            header: "Estado",
            render: (u) => (
              <Badge tone={u.active ? "success" : "neutral"}>{u.active ? "Activo" : "Inactivo"}</Badge>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (u) => (
              <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>
                {u.active ? "Desactivar" : "Activar"}
              </Button>
            ),
          },
        ]}
        rows={users}
        rowKey={(u) => u.id}
        emptyTitle="No hay usuarios registrados"
        emptyDescription="Crea el primer usuario de tu organización."
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo usuario">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError ? <Alert tone="danger">{serverError}</Alert> : null}
          <Input label="Nombre completo" {...register("fullName")} error={errors.fullName?.message} />
          <Input label="Usuario" {...register("username")} error={errors.username?.message} />
          <Input
            label="Contraseña"
            type="password"
            {...register("password")}
            error={errors.password?.message}
          />
          <Select
            label="Rol"
            options={[
              { value: "ADMIN", label: "Administrador" },
              { value: "MANAGER", label: "Encargado" },
              { value: "CASHIER", label: "Cajero" },
            ]}
            {...register("role")}
            error={errors.role?.message}
          />
          <div>
            <Select
              label="Sucursal"
              placeholder={needsBranch ? "Selecciona una sucursal" : "Todas las sucursales"}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              {...register("branchId")}
              error={errors.branchId?.message}
            />
            <p className="mt-1 text-xs text-muted">
              {needsBranch
                ? "Cajeros y encargados operan la caja y el inventario de una sola sucursal."
                : "Un administrador sin sucursal ve el negocio completo."}
            </p>
          </div>
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
