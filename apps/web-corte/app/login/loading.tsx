import { LoadingState } from "@pilotspos/ui";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app">
      <LoadingState label="Cargando..." />
    </div>
  );
}
