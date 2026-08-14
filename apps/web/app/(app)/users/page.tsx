import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Alert, PageHeader } from "@pilotspos/ui";
import { getSession } from "@/lib/session";
import { UsersClient, type UserRow } from "./UsersClient";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

export default async function UsersPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  if (user.role !== "ADMIN") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Usuarios" />
        <Alert tone="warning" title="Acceso restringido">
          Solo un administrador puede gestionar usuarios.
        </Alert>
      </div>
    );
  }

  const response = await fetch(`${API_URL}/users`, {
    headers: { cookie: cookies().toString() },
    cache: "no-store",
  });
  const body = response.ok ? ((await response.json()) as { users: UserRow[] }) : { users: [] };

  return <UsersClient initialUsers={body.users} />;
}
