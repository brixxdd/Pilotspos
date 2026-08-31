"use client";

/**
 * Carrito del menú digital, guardado en el navegador del cliente.
 *
 * Sobrevive a recargar por error y a volver al día siguiente, que es como la
 * gente pide de verdad: arma el pedido en la mañana y lo manda cuando decide.
 * Va en `localStorage` y no en el servidor a propósito — la mayoría de quienes
 * escanean el QR no tienen cuenta, y un carrito que solo funciona con sesión
 * no le sirve a nadie.
 */

const VERSION = 1;
/** Pasada una semana el carrito ya no es un pedido pospuesto, es basura. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface StoredLine {
  quantity: number;
  /** Precio al momento de agregarlo, para avisar si cambió al volver. */
  price: number;
}

export interface StoredCart {
  v: number;
  updatedAt: number;
  items: Record<string, StoredLine>;
}

/**
 * Una clave por sucursal: los precios y el catálogo son de la sucursal, y un
 * pedido armado para Las Minas no debe aparecer al abrir el de La Hermita.
 */
function keyFor(orgSlug: string, branchSlug: string) {
  return `corte:menu-cart:${orgSlug}:${branchSlug}`;
}

/**
 * Todo acceso va envuelto: en modo privado, con cookies de sitio bloqueadas o
 * en algunas vistas incrustadas, `localStorage` lanza al leerlo. El menú tiene
 * que seguir funcionando sin carrito guardado, nunca romperse por eso.
 */
export function loadCart(orgSlug: string, branchSlug: string): StoredCart | null {
  try {
    const raw = window.localStorage.getItem(keyFor(orgSlug, branchSlug));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredCart;
    if (parsed.v !== VERSION || typeof parsed.updatedAt !== "number" || !parsed.items) return null;
    if (Date.now() - parsed.updatedAt > MAX_AGE_MS) {
      clearCart(orgSlug, branchSlug);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveCart(
  orgSlug: string,
  branchSlug: string,
  items: Record<string, StoredLine>,
): void {
  try {
    if (Object.keys(items).length === 0) {
      clearCart(orgSlug, branchSlug);
      return;
    }
    const payload: StoredCart = { v: VERSION, updatedAt: Date.now(), items };
    window.localStorage.setItem(keyFor(orgSlug, branchSlug), JSON.stringify(payload));
  } catch {
    // Sin espacio o sin permiso: el carrito sigue vivo en memoria, solo no persiste.
  }
}

export function clearCart(orgSlug: string, branchSlug: string): void {
  try {
    window.localStorage.removeItem(keyFor(orgSlug, branchSlug));
  } catch {
    // nada que hacer
  }
}

export interface RestoredCart {
  quantities: Record<string, number>;
  /** Productos guardados que ya no están en el menú, por nombre no los tenemos: solo cuántos. */
  removedCount: number;
  /** Productos cuyo precio cambió desde que se agregaron. */
  repricedNames: string[];
  /** Días completos desde la última vez que se tocó el carrito. */
  ageDays: number;
}

/**
 * Reconcilia lo guardado contra el menú de hoy. Un carrito de ayer puede tener
 * cortes que ya no se venden y precios que amanecieron distintos: se descartan
 * los primeros y se avisa de los segundos, en vez de enseñar totales mentirosos.
 */
export function reconcileCart(
  stored: StoredCart,
  currentItems: Map<string, { name: string; price: number }>,
): RestoredCart {
  const quantities: Record<string, number> = {};
  const repricedNames: string[] = [];
  let removedCount = 0;

  for (const [id, line] of Object.entries(stored.items)) {
    // La cantidad se mira antes que nada: una línea en 0 no está en el
    // carrito, así que tampoco cuenta como producto que el menú perdió.
    if (!(line.quantity > 0)) continue;

    const current = currentItems.get(id);
    if (!current) {
      removedCount += 1;
      continue;
    }

    quantities[id] = line.quantity;
    if (current.price !== line.price) repricedNames.push(current.name);
  }

  return {
    quantities,
    removedCount,
    repricedNames,
    ageDays: Math.floor((Date.now() - stored.updatedAt) / (24 * 60 * 60 * 1000)),
  };
}
