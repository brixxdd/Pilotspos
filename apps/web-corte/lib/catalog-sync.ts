import { apiFetch } from "./api-client";
import { getOfflineDb, type CachedProduct } from "./offline-db";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

/** Trae el catálogo completo del servidor y reemplaza la copia local. No lanza si falla — se reintenta en el próximo tick. */
export async function syncCatalog(): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;

  try {
    const { items } = await apiFetch<{ items: CachedProduct[] }>("/products/catalog");
    await db.transaction("rw", db.products, async () => {
      await db.products.clear();
      await db.products.bulkPut(items);
    });
  } catch {
    // Sin conexión o el servidor no respondió: se conserva la copia anterior en caché.
  }
}

/**
 * Arranca la sincronización periódica del catálogo: al montar, cada
 * SYNC_INTERVAL_MS mientras la pestaña esté visible, y al recuperar la
 * conexión. Debe llamarse una sola vez desde un componente montado en toda
 * la sesión autenticada (ver AppShell). Devuelve una función de limpieza.
 */
export function startCatalogSync(): () => void {
  void syncCatalog();

  const interval = setInterval(() => {
    if (document.visibilityState === "visible") void syncCatalog();
  }, SYNC_INTERVAL_MS);

  const handleOnline = () => void syncCatalog();
  window.addEventListener("online", handleOnline);

  return () => {
    clearInterval(interval);
    window.removeEventListener("online", handleOnline);
  };
}
