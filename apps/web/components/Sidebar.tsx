import type { SessionUser } from "@pilotspos/types";
import { NavLink } from "./NavLink";
import { LogoutButton } from "./LogoutButton";

const ROLE_LABELS: Record<SessionUser["role"], string> = {
  ADMIN: "Administrador",
  MANAGER: "Encargado",
  CASHIER: "Cajero",
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/sales", label: "Ventas" },
  { href: "/products", label: "Productos" },
  { href: "/inventory", label: "Inventario" },
  { href: "/cash", label: "Caja" },
  { href: "/reports", label: "Reportes" },
  { href: "/users", label: "Usuarios" },
  { href: "/settings", label: "Configuración" },
];

export function Sidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col justify-between bg-navy-dark">
      <div>
        <div className="px-4 py-5">
          <p className="text-lg font-semibold text-white">PilotsPOS</p>
          <p className="mt-1 text-xs text-white/60">{user.organizationName}</p>
          {user.branchName ? <p className="text-xs text-white/40">{user.branchName}</p> : null}
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/10 px-4 py-4">
        <p className="text-sm font-medium text-white">{user.fullName}</p>
        <p className="text-xs text-white/50">{ROLE_LABELS[user.role]}</p>
        <div className="mt-2">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
