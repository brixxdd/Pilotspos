"use client";

import { useState } from "react";
import type { SessionUser } from "@pilotspos/types";
import { NavLink } from "./NavLink";
import { LogoutButton } from "./LogoutButton";
import {
  BoxesIcon,
  CartIcon,
  ChartIcon,
  HomeIcon,
  ReceiptIcon,
  SettingsIcon,
  StoreIcon,
  UsersIcon,
  WalletIcon,
} from "./icons";

const ROLE_LABELS: Record<SessionUser["role"], string> = {
  ADMIN: "Administrador",
  MANAGER: "Encargado",
  CASHIER: "Cajero",
};

// Admin ve el negocio completo, incluidos usuarios y configuración.
const ADMIN_NAV_ITEMS = [
  { href: "/dashboard", label: "Panel", icon: HomeIcon },
  { href: "/sales", label: "Punto de Venta", icon: CartIcon },
  { href: "/orders", label: "Pedidos", icon: ReceiptIcon },
  { href: "/products", label: "Productos", icon: BoxesIcon },
  { href: "/inventory", label: "Inventario", icon: BoxesIcon },
  { href: "/branches", label: "Sucursales", icon: StoreIcon },
  { href: "/clients", label: "Clientes", icon: UsersIcon },
  { href: "/drivers", label: "Repartidores", icon: CartIcon },
  { href: "/reports", label: "Reportes", icon: ChartIcon },
  { href: "/users", label: "Usuarios", icon: UsersIcon },
  { href: "/settings", label: "Configuración", icon: SettingsIcon },
];

// El Encargado maneja su sucursal: catálogo, inventario y reportes, pero no
// da de alta usuarios ni toca la configuración del negocio.
const MANAGER_NAV_ITEMS = [
  { href: "/dashboard", label: "Panel", icon: HomeIcon },
  { href: "/sales", label: "Punto de Venta", icon: CartIcon },
  { href: "/orders", label: "Pedidos", icon: ReceiptIcon },
  { href: "/products", label: "Productos", icon: BoxesIcon },
  { href: "/inventory", label: "Inventario", icon: BoxesIcon },
  { href: "/clients", label: "Clientes", icon: UsersIcon },
  { href: "/drivers", label: "Repartidores", icon: CartIcon },
  { href: "/cash", label: "Caja", icon: WalletIcon },
  { href: "/reports", label: "Reportes", icon: ChartIcon },
];

// El cajero sólo ve su turno: vender, cuadrar su caja y consultar sus tickets.
// Nada de catálogo, inventario, reportes ni otras sucursales.
const CASHIER_NAV_ITEMS = [
  { href: "/sales", label: "Venta", icon: CartIcon },
  { href: "/orders", label: "Pedidos", icon: ReceiptIcon },
  { href: "/cash", label: "Mi Caja", icon: WalletIcon },
  { href: "/history", label: "Mis Tickets", icon: ReceiptIcon },
  { href: "/clients", label: "Clientes", icon: UsersIcon },
];

const NAV_BY_ROLE: Record<SessionUser["role"], typeof ADMIN_NAV_ITEMS> = {
  ADMIN: ADMIN_NAV_ITEMS,
  MANAGER: MANAGER_NAV_ITEMS,
  CASHIER: CASHIER_NAV_ITEMS,
};

// Placeholder de UI: no está conectado a datos reales todavía — cambiar de
// sucursal no filtra nada, es solo el control visual que pidió el mockup.
// Falta wiring de sesión/backend para que sea funcional de verdad.
const BRANCH_OPTIONS = ["Las Minas", "La Hermita"];

function BranchSwitcher() {
  const [branch, setBranch] = useState(BRANCH_OPTIONS[0]);
  return (
    <select
      value={branch}
      onChange={(event) => setBranch(event.target.value)}
      className="w-full rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/80"
    >
      {BRANCH_OPTIONS.map((option) => (
        <option key={option} value={option} className="text-ink">
          {option}
        </option>
      ))}
    </select>
  );
}

export function Sidebar({ user, onNavigate }: { user: SessionUser; onNavigate?: () => void }) {
  const isAdmin = user.role === "ADMIN" || user.role === "MANAGER";
  const navItems = NAV_BY_ROLE[user.role];

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col justify-between bg-navy">
      <div>
        <div className="px-4 py-5">
          <p className="font-heading text-lg font-semibold text-white">Corte</p>
          <p className="mt-1 text-xs text-white/60">{user.organizationName}</p>
          {!isAdmin && user.branchName ? <p className="text-xs text-white/40">{user.branchName}</p> : null}
          {isAdmin ? (
            <div className="mt-3">
              <BranchSwitcher />
            </div>
          ) : null}
        </div>
        <nav className="flex flex-col gap-1 px-3" onClick={onNavigate}>
          {navItems.map((item) => (
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
