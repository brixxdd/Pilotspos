import { randomBytes, createHash } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "../../shared/db.js";
import { env } from "../../config/env.js";
import { fromQuantity } from "../../shared/numeric.js";
import type { CustomerContext } from "../../shared/customer-context.js";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Crea una sesión de cliente y devuelve el token en claro para la cookie.
 * Espeja `modules/auth/session.service.ts` pero contra `customerSessions`:
 * son dos universos de sesión que nunca se cruzan.
 */
export async function createCustomerSession(params: {
  customerId: string;
  organizationId: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(schema.customerSessions).values({
    id: hashToken(token),
    customerId: params.customerId,
    organizationId: params.organizationId,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function resolveCustomerSession(token: string): Promise<CustomerContext | null> {
  const hashed = hashToken(token);

  const [row] = await db
    .select({
      sessionId: schema.customerSessions.id,
      customerId: schema.customers.id,
      firstName: schema.customers.firstName,
      lastName: schema.customers.lastName,
      phone: schema.customers.phone,
      addressLine: schema.customers.addressLine,
      addressReferences: schema.customers.addressReferences,
      creditLimit: schema.customers.creditLimit,
      balance: schema.customers.balance,
      customerActive: schema.customers.active,
      organizationId: schema.organizations.id,
      organizationName: schema.organizations.name,
      organizationActive: schema.organizations.active,
    })
    .from(schema.customerSessions)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.customerSessions.customerId))
    .innerJoin(
      schema.organizations,
      eq(schema.organizations.id, schema.customerSessions.organizationId),
    )
    .where(and(eq(schema.customerSessions.id, hashed), gt(schema.customerSessions.expiresAt, new Date())))
    .limit(1);

  if (!row || !row.customerActive || !row.organizationActive) return null;

  return {
    sessionId: row.sessionId,
    customerId: row.customerId,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    addressLine: row.addressLine,
    addressReferences: row.addressReferences,
    creditLimit: fromQuantity(row.creditLimit),
    balance: fromQuantity(row.balance),
    organizationId: row.organizationId,
    organizationName: row.organizationName,
  };
}

export async function deleteCustomerSession(token: string): Promise<void> {
  await db.delete(schema.customerSessions).where(eq(schema.customerSessions.id, hashToken(token)));
}

/** Limpia sesiones vencidas. La llama el login, que es cuando ya se paga una escritura. */
export async function purgeExpiredCustomerSessions(): Promise<void> {
  await db.delete(schema.customerSessions).where(lt(schema.customerSessions.expiresAt, new Date()));
}
