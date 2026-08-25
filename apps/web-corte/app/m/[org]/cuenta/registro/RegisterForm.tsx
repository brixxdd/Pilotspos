"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError, type FieldErrors } from "@/lib/api-client";
import { registerCustomer } from "@/lib/customer-client";
import { Field, FormError, Input, SubmitButton, Textarea } from "../fields";

const EMPTY = {
  firstName: "",
  lastName: "",
  phone: "",
  addressLine: "",
  addressReferences: "",
  password: "",
};

export function RegisterForm({ orgSlug, nextHref }: { orgSlug: string; nextHref: string }) {
  const loginHref = `/m/${orgSlug}/cuenta/entrar?next=${encodeURIComponent(nextHref)}`;
  const router = useRouter();
  const [fields, setFields] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  function update(key: keyof typeof EMPTY) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // El error de un campo se borra en cuanto se toca: dejarlo puesto
      // mientras la persona corrige es lo que hace sentir rota una forma.
      setFieldErrors((current) => ({ ...current, [key]: undefined }));
      setFields((current) => ({ ...current, [key]: event.target.value }));
    };
  }

  function firstError(key: keyof typeof EMPTY) {
    return fieldErrors[key]?.[0];
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setPending(true);

    try {
      await registerCustomer({ organizationSlug: orgSlug, ...fields });
      // Primero navegar, después refrescar. Al revés se refresca la pantalla
      // que ya se está dejando, y el destino se sirve del Router Cache de
      // Next (los dinámicos se guardan ~30s en el cliente): el menú volvía a
      // pintarse con la respuesta anterior a iniciar sesión, y solo se
      // arreglaba recargando a mano.
      router.push(nextHref);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        setFieldErrors(caught.fieldErrors);
        // Con errores por campo, el aviso de arriba sobraría: el mensaje ya
        // está pegado al campo que hay que corregir.
        const hasFieldErrors = Object.values(caught.fieldErrors).some((list) => list?.length);
        setError(hasFieldErrors ? null : caught.message);
      } else {
        setError("No se pudo crear la cuenta. Intente de nuevo.");
      }
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormError message={error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={firstError("firstName")}>
          <Input
            autoComplete="given-name"
            placeholder="Marisol"
            value={fields.firstName}
            onChange={update("firstName")}
            required
          />
        </Field>

        <Field label="Apellido" error={firstError("lastName")}>
          <Input
            autoComplete="family-name"
            placeholder="Hernández"
            value={fields.lastName}
            onChange={update("lastName")}
            required
          />
        </Field>
      </div>

      <Field
        label="Teléfono"
        hint="Los 8 dígitos de su celular. Con este número entra a su cuenta."
        error={firstError("phone")}
      >
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="5512 3456"
          value={fields.phone}
          onChange={update("phone")}
          required
        />
      </Field>

      <Field label="Dirección" error={firstError("addressLine")}>
        <Input
          autoComplete="street-address"
          placeholder="Barrio El Calvario, casa 4"
          value={fields.addressLine}
          onChange={update("addressLine")}
        />
      </Field>

      <Field
        label="Referencias exactas"
        hint="Cómo llegar a su casa: color del portón, qué hay enfrente, alguna seña. Esto es lo que de verdad usa quien va a entregar."
        error={firstError("addressReferences")}
      >
        <Textarea
          placeholder="Portón verde frente a la tienda de doña Mari, subiendo por la calle de la iglesia."
          value={fields.addressReferences}
          onChange={update("addressReferences")}
        />
      </Field>

      <Field label="Contraseña" hint="Mínimo 6 caracteres." error={firstError("password")}>
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={fields.password}
          onChange={update("password")}
          minLength={6}
          required
        />
      </Field>

      <SubmitButton pending={pending}>Crear mi cuenta</SubmitButton>

      <p className="pt-1 text-center text-sm text-muted">
        ¿Ya tiene cuenta?{" "}
        <Link
          href={loginHref}
          className="font-semibold text-accent hover:text-accent-hover"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
