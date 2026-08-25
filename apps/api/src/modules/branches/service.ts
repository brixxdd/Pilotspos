import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "../../shared/db.js";

/** Sucursales activas de la organización, para selectores y asignación de personal. */
export async function listBranches(organizationId: string) {
  return db
    .select({
      id: schema.branches.id,
      name: schema.branches.name,
      slug: schema.branches.slug,
      address: schema.branches.address,
      active: schema.branches.active,
    })
    .from(schema.branches)
    .where(and(eq(schema.branches.organizationId, organizationId), eq(schema.branches.active, true)))
    .orderBy(asc(schema.branches.name));
}
