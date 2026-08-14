import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { Alert, Button, PageHeader } from "@pilotspos/ui";
import { getSession } from "@/lib/session";
import { SalesClient } from "./SalesClient";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

export default async function SalesPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const response = await fetch(`${API_URL}/cash/session`, {
    headers: { cookie: cookies().toString() },
    cache: "no-store",
  });
  const body = response.ok ? ((await response.json()) as { session: unknown }) : { session: null };

  if (!body.session) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Ventas" />
        <Alert tone="warning" title="No tienes una caja abierta">
          Debes abrir tu caja antes de comenzar a vender.
        </Alert>
        <Link href="/cash">
          <Button>Ir a Caja</Button>
        </Link>
      </div>
    );
  }

  return <SalesClient role={user.role} />;
}
