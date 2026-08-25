import { cookies } from "next/headers";
import { Alert, PageHeader } from "@pilotspos/ui";
import { requirePermission } from "@/lib/guards";
import { UsersClient, type BranchOption, type UserRow } from "./UsersClient";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

export default async function UsersPage() {
  const user = await requirePermission("users.manage");

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

  const cookie = cookies().toString();
  const [usersResponse, branchesResponse] = await Promise.all([
    fetch(`${API_URL}/users`, { headers: { cookie }, cache: "no-store" }),
    fetch(`${API_URL}/branches`, { headers: { cookie }, cache: "no-store" }),
  ]);

  const body = usersResponse.ok
    ? ((await usersResponse.json()) as { users: UserRow[] })
    : { users: [] };
  const branchesBody = branchesResponse.ok
    ? ((await branchesResponse.json()) as { branches: BranchOption[] })
    : { branches: [] };

  return <UsersClient initialUsers={body.users} branches={branchesBody.branches} />;
}
