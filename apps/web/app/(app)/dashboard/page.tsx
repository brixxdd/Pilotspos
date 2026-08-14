import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@pilotspos/ui";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Hola, ${user.fullName.split(" ")[0]}`}
        description={`${user.organizationName}${user.branchName ? ` · ${user.branchName}` : ""}`}
      />

      <Card>
        <p className="text-sm text-ink">
          Sesión iniciada correctamente como <strong>{user.username}</strong> ({user.role}).
        </p>
        <p className="mt-2 text-sm text-muted">
          Los indicadores de ventas, inventario y caja del día se activan en la Fase 7 del
          desarrollo (Reportes y Dashboard).
        </p>
      </Card>
    </div>
  );
}
