"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { SessionUser } from "@pilotspos/types";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { OfflineBanner } from "./OfflineBanner";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";
import { cn } from "@pilotspos/ui";
import { startCatalogSync } from "@/lib/catalog-sync";
import { startOfflineSalesSync } from "@/lib/offline-queue";

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stopCatalogSync = startCatalogSync();
    const stopSalesSync = startOfflineSalesSync();
    return () => {
      stopCatalogSync();
      stopSalesSync();
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-app">
      <ServiceWorkerRegister />
      <OfflineBanner />
      <div className="flex flex-1 overflow-hidden">
        {mobileOpen ? (
          <div
            className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        ) : null}

        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 transition-transform lg:static lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar user={user} onNavigate={() => setMobileOpen(false)} />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header user={user} onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
