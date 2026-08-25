import { Alert, PageHeader } from "@pilotspos/ui";
import { requirePermission } from "@/lib/guards";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const user = await requirePermission("reports.view");

  if (user.role === "CASHIER") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Reportes" />
        <Alert tone="warning" title="Acceso restringido">
          Solo un administrador o encargado puede ver los reportes.
        </Alert>
      </div>
    );
  }

  return <ReportsClient />;
}
