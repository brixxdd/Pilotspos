import { requirePermission } from "@/lib/guards";
import { ComingSoon } from "@/components/ComingSoon";

export default async function BranchesPage() {
  const user = await requirePermission("reports.view");

  return <ComingSoon title="Sucursales" phase="la siguiente fase (gestión de sucursales aún no tiene API)" />;
}
