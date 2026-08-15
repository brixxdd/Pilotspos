"use client";

import { useEffect } from "react";

/** Registra el service worker mínimo de apps/web/public/sw.js — ver ese archivo para el alcance. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // El shell offline es una mejora, no un requisito: si el registro falla, la app sigue funcionando en línea.
      });
    }
  }, []);

  return null;
}
