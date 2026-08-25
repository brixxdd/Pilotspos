"use client";

import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { getOfflineDb } from "@/lib/offline-db";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const db = getOfflineDb();
    if (!db) return;
    const subscription = liveQuery(() => db.pendingSales.count()).subscribe({
      next: setPendingCount,
      error: () => setPendingCount(0),
    });
    return () => subscription.unsubscribe();
  }, []);

  if (online && pendingCount === 0) return null;

  if (!online) {
    return (
      <div className="flex items-center justify-center gap-2 bg-warning px-4 py-1.5 text-center text-xs font-medium text-white">
        <span>Sin conexión — podés seguir vendiendo, las ventas se guardan en este equipo.</span>
        {pendingCount > 0 ? (
          <span className="rounded-full bg-white/20 px-2 py-0.5">{pendingCount} por sincronizar</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-navy px-4 py-1.5 text-center text-xs font-medium text-white">
      Sincronizando {pendingCount} venta(s) pendiente(s)...
    </div>
  );
}
