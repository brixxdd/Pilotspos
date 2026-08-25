import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ComingSoon } from "@/components/ComingSoon";

export default async function HistoryPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return <ComingSoon title="Historial" phase="la siguiente fase (vista de historial de ventas para cajero)" />;
}
