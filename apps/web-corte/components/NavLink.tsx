"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "@pilotspos/ui";

export function NavLink({
  href,
  icon: NavIcon,
  children,
}: {
  href: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md border-l-2 px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "border-accent bg-white/10 text-white"
          : "border-transparent text-white/70 hover:border-white/20 hover:bg-white/5 hover:text-white",
      )}
    >
      {NavIcon ? <NavIcon className={cn("shrink-0", active ? "text-accent" : "text-white/50")} /> : null}
      {children}
    </Link>
  );
}
