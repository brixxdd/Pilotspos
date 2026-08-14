import { asc, eq } from "drizzle-orm";
import { db, schema } from "../../shared/db.js";
import type { CategoryCreateInput } from "@pilotspos/validation";

export async function listCategories(organizationId: string) {
  return db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.organizationId, organizationId))
    .orderBy(asc(schema.categories.name));
}

export async function createCategory(organizationId: string, input: CategoryCreateInput) {
  const [created] = await db
    .insert(schema.categories)
    .values({ organizationId, name: input.name })
    .returning();
  return created;
}
