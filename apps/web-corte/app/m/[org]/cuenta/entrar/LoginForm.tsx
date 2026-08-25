"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError, type FieldErrors } from "@/lib/api-client";
import { loginCustomer } from "@/lib/customer-client";
import { Field, FormError, Input, SubmitButton } from "../fields";

export function LoginForm({ orgSlug, nextHref }: { orgSlug: string; nextHref: string }) {
  const registerHref = `/m/${orgSlug}/cuenta/registro?next=${encodeURIComponent(nextHref)}`;
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setPending(true);

    try {
      await loginCustomer({ organizationSlug: orgSlug, phone, password });
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
        const hasFieldErrors = Object.values(caught.fieldErrors).some((list) => list?.length);
        setError(hasFieldErrors ? null : caught.message);
      } else {
        setError("No se pudo entrar. Intente de nuevo.");
      }
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormError message={error} />

      <Field label="Teléfono" hint="Los 8 dígitos de su celular." error={fieldErrors.phone?.[0]}>
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="5512 3456"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
        />
      </Field>

      <Field label="Contraseña" error={fieldErrors.password?.[0]}>
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>

      <SubmitButton pending={pending}>Entrar</SubmitButton>

      <p className="pt-1 text-center text-sm text-muted">
        ¿Todavía no tiene cuenta?{" "}
        <Link
          href={registerHref}
          className="font-semibold text-accent hover:text-accent-hover"
        >
          Crear una
        </Link>
      </p>
    </form>
  );
}
