"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError, type FieldErrors } from "@/lib/api-client";
import { loginDriver } from "@/lib/driver-client";

export function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setPending(true);

    try {
      await loginDriver({ phone, pin });
      // Primero navegar, después refrescar (ver LoginForm del menú digital).
      router.push("/r");
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
      {error ? (
        <p className="rounded-xl border border-danger/30 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <label className="block">
        <span className="text-sm font-medium text-ink">Teléfono</span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="5512 3456"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
          className="mt-1 w-full rounded-xl border border-line bg-app px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {fieldErrors.phone?.[0] ? <span className="mt-1 block text-xs text-danger">{fieldErrors.phone[0]}</span> : null}
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">PIN</span>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          placeholder="••••"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          required
          className="mt-1 w-full rounded-xl border border-line bg-app px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {fieldErrors.pin?.[0] ? <span className="mt-1 block text-xs text-danger">{fieldErrors.pin[0]}</span> : null}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 text-[15px] font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
