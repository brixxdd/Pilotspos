import { and, asc, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "../../shared/db.js";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import type { UserCreateInput, UserUpdateInput } from "@pilotspos/validation";

const SAFE_COLUMNS = {
  id: schema.users.id,
  organizationId: schema.users.organizationId,
  branchId: schema.users.branchId,
  username: schema.users.username,
  fullName: schema.users.fullName,
  role: schema.users.role,
  active: schema.users.active,
  createdAt: schema.users.createdAt,
  updatedAt: schema.users.updatedAt,
};

export async function listUsers(organizationId: string) {
  return db
    .select({ ...SAFE_COLUMNS, branchName: schema.branches.name })
    .from(schema.users)
    .leftJoin(schema.branches, eq(schema.branches.id, schema.users.branchId))
    .where(eq(schema.users.organizationId, organizationId))
    .orderBy(asc(schema.users.fullName));
}

export async function createUser(organizationId: string, input: UserCreateInput) {
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(eq(schema.users.organizationId, organizationId), eq(schema.users.username, input.username)))
    .limit(1);
  if (existing) throw new ConflictError("Ya existe un usuario con ese nombre de usuario");

  const passwordHash = await bcrypt.hash(input.password, 10);

  const [created] = await db
    .insert(schema.users)
    .values({
      organizationId,
      username: input.username,
      fullName: input.fullName,
      passwordHash,
      role: input.role,
      branchId: input.branchId ?? null,
    })
    .returning(SAFE_COLUMNS);

  return created;
}

export async function updateUser(organizationId: string, userId: string, input: UserUpdateInput) {
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(eq(schema.users.id, userId), eq(schema.users.organizationId, organizationId)))
    .limit(1);
  if (!existing) throw new NotFoundError("Usuario no encontrado");

  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined;

  const [updated] = await db
    .update(schema.users)
    .set({
      fullName: input.fullName,
      role: input.role,
      branchId: input.branchId,
      active: input.active,
      passwordHash,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.users.id, userId), eq(schema.users.organizationId, organizationId)))
    .returning(SAFE_COLUMNS);

  return updated;
}

export async function deactivateUser(organizationId: string, userId: string) {
  const [updated] = await db
    .update(schema.users)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(schema.users.id, userId), eq(schema.users.organizationId, organizationId)))
    .returning(SAFE_COLUMNS);
  if (!updated) throw new NotFoundError("Usuario no encontrado");
  return updated;
}
