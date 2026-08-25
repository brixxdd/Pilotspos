"use client";

import { useEffect } from "react";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app px-4 text-center">
      <p className="text-lg font-semibold text-ink">Ocurrió un error inesperado</p>
      <p className="max-w-sm text-sm text-muted">{error.message || "Intenta recargar la página."}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Reintentar
      </button>
    </div>
  );
}
