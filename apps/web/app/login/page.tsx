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
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-navy p-12 text-white lg:flex">
        <div>
          <Image src="/logo.png" alt="PilotsPOS" width={56} height={56} className="rounded-xl" priority />
          <p className="mt-4 text-2xl font-semibold">PilotsPOS</p>
          <p className="mt-1 text-sm text-white/70">Punto de venta Web SaaS</p>
        </div>
        <div className="space-y-2 text-sm text-white/80">
          <p>Plataforma cloud</p>
          <p>Multiempresa</p>
          <p>Acceso seguro con cookies HTTP-only</p>
        </div>
        <p className="text-xs text-white/50">DevPilots · PilotsPOS</p>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-app p-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-ink">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-muted">
            Ingresa tus credenciales para acceder a PilotsPOS.
          </p>
          <div className="mt-6">
            <LoginForm organizations={organizations} />
          </div>
          <div className="mt-8 flex justify-between border-t border-line pt-4 text-xs text-muted">
            <span>Servidor API</span>
            <span className={organizations.length > 0 ? "text-success" : "text-danger"}>
              {organizations.length > 0 ? "Conectado" : "Sin conexión"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
