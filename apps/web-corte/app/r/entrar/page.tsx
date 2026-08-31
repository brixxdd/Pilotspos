import { redirect } from "next/navigation";
import { getDriverSession } from "@/lib/driver-session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Portal del repartidor" };

export default async function DriverLoginPage() {
  if (await getDriverSession()) redirect("/r");

  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-4 py-10">
      <div className="w-full max-w-sm">
        <header className="text-center">
          <p className="font-heading text-2xl font-bold text-ink">Portal del repartidor</p>
          <p className="mt-1 text-sm text-muted">Sus entregas y su perfil, en un solo lugar.</p>
        </header>

        <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
          <LoginForm />
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-muted">
          El PIN se lo asigna el mostrador de la carnicería.
        </p>
      </div>
    </main>
  );
}
