import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ComingSoon } from "@/components/ComingSoon";

export default async function ClientsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return <ComingSoon title="Clientes" phase="la siguiente fase (no existe todavía un modelo de clientes en el backend)" />;
}
