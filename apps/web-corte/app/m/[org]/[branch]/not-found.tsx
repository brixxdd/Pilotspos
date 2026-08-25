import Link from "next/link";

export default function MenuNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-heading text-2xl font-semibold text-ink">Este menú no está disponible</p>
      <p className="max-w-sm text-sm text-muted">
        Puede que el enlace esté mal escrito o que la sucursal ya no esté activa. Pregunte en el
        mostrador por el código actualizado.
      </p>
      <Link href="/" className="mt-2 text-sm font-semibold text-accent hover:text-accent-hover">
        Ir al inicio
      </Link>
    </main>
  );
}
