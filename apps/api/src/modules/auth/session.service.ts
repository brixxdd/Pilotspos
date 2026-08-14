import { randomBytes, createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "../../shared/db.js";
import { env } from "../../config/env.js";
import type { AuthContext } from "../../shared/auth-context.js";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Crea una sesión server-side y devuelve el token en claro que debe viajar
 * en la cookie. Solo el hash del token se persiste en la base de datos.
 */
export async function createSession(params: {
  userId: string;
  organizationId: string;
  branchId: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(schema.sessions).values({
    id: hashToken(token),
    userId: params.userId,
    organizationId: params.organizationId,
    branchId: params.branchId,
    expiresAt,
  });

  return { token, expiresAt };
}

/** Resuelve un token de cookie a su contexto de autenticación completo, si es válido. */
export async function resolveSession(token: string): Promise<AuthContext | null> {
  const hashed = hashToken(token);

  const [row] = await db
    .select({
      sessionId: schema.sessions.id,
      userId: schema.users.id,
      username: schema.users.username,
      fullName: schema.users.fullName,
      role: schema.users.role,
      userActive: schema.users.active,
      organizationId: schema.organizations.id,
      organizationName: schema.organizations.name,
      organizationActive: schema.organizations.active,
      branchId: schema.branches.id,
      branchName: schema.branches.name,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.sessions.organizationId))
    .leftJoin(schema.branches, eq(schema.branches.id, schema.sessions.branchId))
    .where(and(eq(schema.sessions.id, hashed), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);

  if (!row || !row.userActive || !row.organizationActive) return null;

  return {
    sessionId: row.sessionId,
    userId: row.userId,
    username: row.username,
    fullName: row.fullName,
    role: row.role,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    branchId: row.branchId,
    branchName: row.branchName,
  };
}

export async function deleteSession(token: string): Promise<void> {
  const hashed = hashToken(token);
  await db.delete(schema.sessions).where(eq(schema.sessions.id, hashed));
}
