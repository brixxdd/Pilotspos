import { randomBytes, createHash } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "../../shared/db.js";
import { env } from "../../config/env.js";
import type { DriverContext } from "../../shared/driver-context.js";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Sesión del repartidor en su portal. Tercer universo, aparte del staff y el cliente. */
export async function createDriverSession(params: {
  driverId: string;
  organizationId: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(schema.driverSessions).values({
    id: hashToken(token),
    driverId: params.driverId,
    organizationId: params.organizationId,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function resolveDriverSession(token: string): Promise<DriverContext | null> {
  const hashed = hashToken(token);

  const [row] = await db
    .select({
      sessionId: schema.driverSessions.id,
      driverId: schema.drivers.id,
      name: schema.drivers.name,
      phone: schema.drivers.phone,
      driverActive: schema.drivers.active,
      organizationId: schema.organizations.id,
      organizationName: schema.organizations.name,
      organizationActive: schema.organizations.active,
    })
    .from(schema.driverSessions)
    .innerJoin(schema.drivers, eq(schema.drivers.id, schema.driverSessions.driverId))
    .innerJoin(
      schema.organizations,
      eq(schema.organizations.id, schema.driverSessions.organizationId),
    )
    .where(and(eq(schema.driverSessions.id, hashed), gt(schema.driverSessions.expiresAt, new Date())))
    .limit(1);

  if (!row || !row.driverActive || !row.organizationActive) return null;

  return {
    sessionId: row.sessionId,
    driverId: row.driverId,
    name: row.name,
    phone: row.phone,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
  };
}

export async function deleteDriverSession(token: string): Promise<void> {
  await db.delete(schema.driverSessions).where(eq(schema.driverSessions.id, hashToken(token)));
}

/** Limpia sesiones vencidas. La llama el login del repartidor. */
export async function purgeExpiredDriverSessions(): Promise<void> {
  await db.delete(schema.driverSessions).where(lt(schema.driverSessions.expiresAt, new Date()));
}
