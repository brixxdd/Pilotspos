"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionCustomer } from "@pilotspos/types";
import { ApiClientError, type FieldErrors } from "@/lib/api-client";
import { logoutCustomer, updateCustomerProfile } from "@/lib/customer-client";
import { Field, FormError, Input, SubmitButton, Textarea } from "./fields";

const quetzales = new Intl.NumberFormat("es-GT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatQ(value: number) {
  return `Q${quetzales.format(value)}`;
}

export function AccountForm({ customer, orgSlug }: { customer: SessionCustomer; orgSlug: string }) {
  const router = useRouter();
  const [fields, setFields] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    addressLine: customer.addressLine ?? "",
    addressReferences: customer.addressReferences ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  function update(key: keyof typeof fields) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSaved(false);
      setFieldErrors((current) => ({ ...current, [key]: undefined }));
      setFields((current) => ({ ...current, [key]: event.target.value }));
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setPending(true);

    try {
      await updateCustomerProfile(fields);
      setSaved(true);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        setFieldErrors(caught.fieldErrors);
        const hasFieldErrors = Object.values(caught.fieldErrors).some((list) => list?.length);
        setError(hasFieldErrors ? null : caught.message);
      } else {
        setError("No se pudo guardar. Intente de nuevo.");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleLogout() {
    await logoutCustomer();
    router.push(`/m/${orgSlug}`);
    router.refresh();
  }

  const hasCredit = customer.creditLimit > 0;

  return (
    <div className="space-y-6">
      <section
        className={`rounded-2xl border p-4 ${
          hasCredit ? "border-accent/25 bg-accent/[0.05]" : "border-line bg-app"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Fiado</p>

        {hasCredit ? (
          <>
            <p className="mt-1.5 font-heading text-2xl font-bold tabular-nums text-ink">
              {formatQ(customer.availableCredit)}
              <span className="ml-1.5 text-sm font-normal text-muted">disponible</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{
                  width: `${Math.min(100, (customer.balance / customer.creditLimit) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              Debe {formatQ(customer.balance)} de un límite de {formatQ(customer.creditLimit)}.
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Todavía no tiene crédito autorizado. El fiado lo aprueba el mostrador de la carnicería —
            pregunte ahí y le asignan su límite.
          </p>
        )}
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError message={error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" error={fieldErrors.firstName?.[0]}>
            <Input value={fields.firstName} onChange={update("firstName")} required />
          </Field>
          <Field label="Apellido" error={fieldErrors.lastName?.[0]}>
            <Input value={fields.lastName} onChange={update("lastName")} required />
          </Field>
        </div>

        <Field label="Teléfono" hint="Es su identidad de acceso. Para cambiarlo, hable con la carnicería.">
          <Input value={customer.phone} disabled readOnly />
        </Field>

        <Field label="Dirección" error={fieldErrors.addressLine?.[0]}>
          <Input value={fields.addressLine} onChange={update("addressLine")} />
        </Field>

        <Field
          label="Referencias exactas"
          hint="Cómo llegar a su casa. Esto es lo que usa quien va a entregar."
          error={fieldErrors.addressReferences?.[0]}
        >
          <Textarea value={fields.addressReferences} onChange={update("addressReferences")} />
        </Field>

        {saved && (
          <p className="animate-rise rounded-2xl border border-success/25 bg-success/[0.08] px-4 py-3 text-sm font-medium text-success">
            Datos guardados.
          </p>
        )}

        <SubmitButton pending={pending}>Guardar cambios</SubmitButton>
      </form>

      <button
        type="button"
        onClick={handleLogout}
        className="w-full rounded-2xl border border-line px-6 py-3.5 text-sm font-semibold text-muted transition-colors hover:border-danger/40 hover:text-danger"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
