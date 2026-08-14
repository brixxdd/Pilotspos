"use client";

import { useEffect } from "react";
import { Alert, Button } from "@pilotspos/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4">
      <Alert tone="danger" title="Ocurrió un error inesperado">
        {error.message || "Algo salió mal al cargar esta página."}
      </Alert>
      <Button onClick={reset} className="w-fit">
        Reintentar
      </Button>
    </div>
  );
}
