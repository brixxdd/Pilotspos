"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@pilotspos/validation";
import type { SessionUser } from "@pilotspos/types";
import { Alert, Button, Input, Select } from "@pilotspos/ui";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { BootstrapOrganization } from "./types";

export function LoginForm({ organizations }: { organizations: BootstrapOrganization[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { organizationSlug: organizations[0]?.slug ?? "" },
  });

  const selectedSlug = watch("organizationSlug");
  const selectedOrg = useMemo(
    () => organizations.find((org) => org.slug === selectedSlug),
    [organizations, selectedSlug],
  );

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      await apiFetch<{ user: SessionUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerError(error.message);
      } else {
        setServerError("No se pudo conectar con el servidor");
      }
    }
  }

  if (organizations.length === 0) {
    return (
      <Alert tone="warning" title="Sin organizaciones disponibles">
        Aún no hay ninguna organización registrada en PilotsPOS.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

      <Select
        label="Organización / Empresa"
        options={organizations.map((org) => ({ value: org.slug, label: org.name }))}
        {...register("organizationSlug")}
        error={errors.organizationSlug?.message}
      />

      {selectedOrg && selectedOrg.branches.length > 0 ? (
        <Select
          label="Sucursal"
          placeholder="Automática según tu usuario"
          options={selectedOrg.branches.map((branch) => ({ value: branch.id, label: branch.name }))}
          {...register("branchId")}
          error={errors.branchId?.message}
        />
      ) : null}

      <Input
        label="Usuario"
        autoComplete="username"
        {...register("username")}
        error={errors.username?.message}
      />

      <Input
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        {...register("password")}
        error={errors.password?.message}
      />

      <Button type="submit" size="lg" loading={isSubmitting} className="mt-2">
        Ingresar al sistema
      </Button>
    </form>
  );
}
