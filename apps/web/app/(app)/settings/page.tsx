import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Badge, Card, PageHeader } from "@pilotspos/ui";
import { getSession } from "@/lib/session";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

interface RegisterRow {
  id: string;
  name: string;
  active: boolean;
}

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const response = await fetch(`${API_URL}/cash/registers`, {
    headers: { cookie: cookies().toString() },
    cache: "no-store",
  });
  const registers = response.ok ? ((await response.json()) as { registers: RegisterRow[] }).registers : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configuración" description="Información de tu negocio y preferencias." />

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">Negocio</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Organización</dt>
            <dd className="text-ink">{user.organizationName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Sucursal</dt>
            <dd className="text-ink">{user.branchName ?? "—"}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">Cajas</h2>
        {registers.length === 0 ? (
          <p className="text-sm text-muted">No hay cajas registradas.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {registers.map((register) => (
              <div key={register.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">{register.name}</span>
                <Badge tone={register.active ? "success" : "neutral"}>
                  {register.active ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">Ticket</h2>
        <p className="text-sm text-muted">
          Los tickets se generan en formato 80mm optimizado para impresión desde el navegador. La
          configuración de formato e impresión directa (ESC/POS) llega en una fase posterior.
        </p>
      </Card>

      <p className="text-xs text-muted">
        La edición de estos datos (razón social, sucursales, cajas) se habilita cuando el plan de
        suscripción lo requiera — por ahora se administran desde el equipo de DevPilots.
      </p>
    </div>
  );
}
