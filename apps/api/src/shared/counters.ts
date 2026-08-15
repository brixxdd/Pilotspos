import { sql } from "drizzle-orm";
import type { Transaction } from "./db.js";
import { schema } from "./db.js";

/**
 * Devuelve el siguiente valor de un contador por organización de forma atómica.
 *
 * Usa INSERT ... ON CONFLICT DO UPDATE: Postgres bloquea la fila en conflicto
 * antes de aplicar `nextValue + 1`, así que dos transacciones concurrentes
 * incrementando el mismo contador quedan serializadas por el motor — no hay
 * ventana en la que ambas lean el mismo valor (a diferencia de un SELECT
 * count(*) seguido de un INSERT, que sí puede duplicar folios bajo carga).
 *
 * Debe llamarse dentro de la misma transacción que inserta la fila que
 * consume el número, para que un rollback también revierta el contador.
 */
export async function nextCounterValue(tx: Transaction, organizationId: string, counterKey: string) {
  const [row] = await tx
    .insert(schema.numberCounters)
    .values({ organizationId, counterKey, nextValue: 2 })
    .onConflictDoUpdate({
      target: [schema.numberCounters.organizationId, schema.numberCounters.counterKey],
      set: { nextValue: sql`${schema.numberCounters.nextValue} + 1` },
    })
    .returning({ nextValue: schema.numberCounters.nextValue });

  if (!row) throw new Error(`No se pudo generar el siguiente número para "${counterKey}"`);
  return row.nextValue - 1;
}
