import { redirect } from "next/navigation";
import Image from "next/image";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";
import type { BootstrapOrganization } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

async function getBootstrapOrganizations(): Promise<BootstrapOrganization[]> {
  try {
    const response = await fetch(`${API_URL}/auth/bootstrap`, { cache: "no-store" });
    if (!response.ok) return [];
    const body = (await response.json()) as { organizations: BootstrapOrganization[] };
    return body.organizations;
  } catch {
    return [];
  }
}

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const organizations = await getBootstrapOrganizations();

  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <Image src="/logo.png" alt="PilotsPOS" width={64} height={64} className="rounded-2xl" priority />
            <h1 className="mt-6 text-2xl font-semibold text-ink">Bienvenido de nuevo</h1>
            <p className="mt-2 text-sm text-muted">Ingresa tus credenciales para acceder a PilotsPOS.</p>
          </div>

          <div className="mt-8">
            <LoginForm organizations={organizations} />
          </div>

          <div className="mt-8 flex justify-between border-t border-line pt-4 text-xs text-muted">
            <span>Servidor API</span>
            <span className={organizations.length > 0 ? "text-success" : "text-danger"}>
              {organizations.length > 0 ? "Conectado" : "Sin conexión"}
            </span>
          </div>

          <p className="mt-6 text-center text-xs text-muted">DevPilots · PilotsPOS</p>
        </div>
      </div>

      <div className="relative hidden w-1/2 lg:block">
        <Image
          src="/login-visual.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}
