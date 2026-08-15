import type { SessionUser } from "@pilotspos/types";
import { NavLink } from "./NavLink";
import { LogoutButton } from "./LogoutButton";
import {
  BoxesIcon,
  CartIcon,
  ChartIcon,
  HomeIcon,
  PackageIcon,
  SettingsIcon,
  UsersIcon,
  WalletIcon,
} from "./icons";

const ROLE_LABELS: Record<SessionUser["role"], string> = {
  ADMIN: "Administrador",
  MANAGER: "Encargado",
  CASHIER: "Cajero",
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: HomeIcon },
  { href: "/sales", label: "Ventas", icon: CartIcon },
  { href: "/products", label: "Productos", icon: PackageIcon },
  { href: "/inventory", label: "Inventario", icon: BoxesIcon },
  { href: "/cash", label: "Caja", icon: WalletIcon },
  { href: "/reports", label: "Reportes", icon: ChartIcon },
  { href: "/users", label: "Usuarios", icon: UsersIcon },
  { href: "/settings", label: "Configuración", icon: SettingsIcon },
];

export function Sidebar({ user, onNavigate }: { user: SessionUser; onNavigate?: () => void }) {
  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col justify-between bg-navy-dark">
      <div>
        <div className="px-4 py-5">
          <p className="text-lg font-semibold text-white">PilotsPOS</p>
          <p className="mt-1 text-xs text-white/60">{user.organizationName}</p>
          {user.branchName ? <p className="text-xs text-white/40">{user.branchName}</p> : null}
        </div>
        <nav className="flex flex-col gap-1 px-3" onClick={onNavigate}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon}>
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
