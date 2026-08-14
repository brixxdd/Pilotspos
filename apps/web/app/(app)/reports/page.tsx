import { redirect } from "next/navigation";
import { Alert, PageHeader } from "@pilotspos/ui";
import { getSession } from "@/lib/session";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

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
