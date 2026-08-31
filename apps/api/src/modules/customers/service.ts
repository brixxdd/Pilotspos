import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "../../shared/db.js";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../shared/errors.js";
import { fromQuantity } from "../../shared/numeric.js";
import type { CustomerListQuery, CustomerCreditUpdateInput } from "@pilotspos/validation";
import type { CustomerListItem, Paginated } from "@pilotspos/types";
import type { SessionCustomer } from "@pilotspos/types";
import type {
  CustomerLoginInput,
  CustomerProfileUpdateInput,
  CustomerRegisterInput,
} from "@pilotspos/validation";
import type { CustomerContext } from "../../shared/customer-context.js";
import { createCustomerSession, purgeExpiredCustomerSessions } from "./session.service.js";

const BCRYPT_ROUNDS = 10;

async function findActiveOrganization(slug: string) {
  const [organization] = await db
    .select({ id: schema.organizations.id, name: schema.organizations.name })
    .from(schema.organizations)
    .where(and(eq(schema.organizations.slug, slug), eq(schema.organizations.active, true)))
    .limit(1);
  return organization ?? null;
}

/** El crédito disponible nunca es negativo, aunque el saldo se pase del límite. */
function availableCredit(creditLimit: number, balance: number) {
  return Math.max(0, creditLimit - balance);
}

export function toSessionCustomer(context: CustomerContext): SessionCustomer {
  return {
    id: context.customerId,
    firstName: context.firstName,
    lastName: context.lastName,
    phone: context.phone,
    addressLine: context.addressLine,
    addressReferences: context.addressReferences,
    creditLimit: context.creditLimit,
    balance: context.balance,
    availableCredit: availableCredit(context.creditLimit, context.balance),
    organizationId: context.organizationId,
    organizationName: context.organizationName,
  };
}

export async function registerCustomer(
  input: CustomerRegisterInput,
): Promise<{ token: string; expiresAt: Date; context: CustomerContext }> {
  const organization = await findActiveOrganization(input.organizationSlug);
  if (!organization) throw new NotFoundError("Negocio no encontrado");

  const [existing] = await db
    .select({ id: schema.customers.id })
    .from(schema.customers)
    .where(
      and(eq(schema.customers.organizationId, organization.id), eq(schema.customers.phone, input.phone)),
    )
    .limit(1);
  if (existing) throw new ConflictError("Ya hay una cuenta con ese teléfono. Inicie sesión.");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // El fiado no se auto-otorga: toda cuenta nueva nace en 0 y es el mostrador
  // quien decide a quién le fía y por cuánto.
  const [customer] = await db
    .insert(schema.customers)
    .values({
      organizationId: organization.id,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      addressLine: input.addressLine || null,
      addressReferences: input.addressReferences || null,
      passwordHash,
    })
    .returning();

  if (!customer) throw new ConflictError("No se pudo crear la cuenta");

  const { token, expiresAt } = await createCustomerSession({
    customerId: customer.id,
    organizationId: organization.id,
  });

  return {
    token,
    expiresAt,
    context: {
      sessionId: "",
      customerId: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      addressLine: customer.addressLine,
      addressReferences: customer.addressReferences,
      creditLimit: fromQuantity(customer.creditLimit),
      balance: fromQuantity(customer.balance),
      organizationId: organization.id,
      organizationName: organization.name,
    },
  };
}

export async function loginCustomer(
  input: CustomerLoginInput,
): Promise<{ token: string; expiresAt: Date; context: CustomerContext }> {
  // Mismo mensaje si falla el negocio, el teléfono o la contraseña: no se le
  // dice a nadie qué teléfonos tienen cuenta en la carnicería.
  const genericError = () => new UnauthorizedError("Teléfono o contraseña incorrectos");

  const organization = await findActiveOrganization(input.organizationSlug);
  if (!organization) throw genericError();

  const [customer] = await db
    .select()
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.organizationId, organization.id),
        eq(schema.customers.phone, input.phone),
        eq(schema.customers.active, true),
      ),
    )
    .limit(1);
  if (!customer) throw genericError();

  const passwordMatches = await bcrypt.compare(input.password, customer.passwordHash);
  if (!passwordMatches) throw genericError();

  await purgeExpiredCustomerSessions();

  const { token, expiresAt } = await createCustomerSession({
    customerId: customer.id,
    organizationId: organization.id,
  });

  return {
    token,
    expiresAt,
    context: {
      sessionId: "",
      customerId: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      addressLine: customer.addressLine,
      addressReferences: customer.addressReferences,
      creditLimit: fromQuantity(customer.creditLimit),
      balance: fromQuantity(customer.balance),
      organizationId: organization.id,
      organizationName: organization.name,
    },
  };
}

/**
 * El cliente edita su nombre y su dirección, nada más. `creditLimit`, `balance`
 * y `phone` quedan fuera a propósito: el crédito lo fija el negocio y el
 * teléfono es la identidad con la que inició sesión.
 */
export async function updateCustomerProfile(
  customerId: string,
  input: CustomerProfileUpdateInput,
): Promise<SessionCustomer> {
  const [updated] = await db
    .update(schema.customers)
    .set({
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.addressLine !== undefined ? { addressLine: input.addressLine || null } : {}),
      ...(input.addressReferences !== undefined
        ? { addressReferences: input.addressReferences || null }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.customers.id, customerId))
    .returning();

  if (!updated) throw new NotFoundError("Cliente no encontrado");

  const [organization] = await db
    .select({ id: schema.organizations.id, name: schema.organizations.name })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, updated.organizationId))
    .limit(1);

  const creditLimit = fromQuantity(updated.creditLimit);
  const balance = fromQuantity(updated.balance);

  return {
    id: updated.id,
    firstName: updated.firstName,
    lastName: updated.lastName,
    phone: updated.phone,
    addressLine: updated.addressLine,
    addressReferences: updated.addressReferences,
    creditLimit,
    balance,
    availableCredit: availableCredit(creditLimit, balance),
    organizationId: updated.organizationId,
    organizationName: organization?.name ?? "",
  };
}

// ---------------------------------------------------------------------------
// Vista del personal (mostrador y panel) — requirePermission("customers.view")
// ---------------------------------------------------------------------------

function toCustomerListItem(row: typeof schema.customers.$inferSelect): CustomerListItem {
  const creditLimit = fromQuantity(row.creditLimit);
  const balance = fromQuantity(row.balance);
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    phone: row.phone,
    addressLine: row.addressLine,
    addressReferences: row.addressReferences,
    creditLimit,
    balance,
    availableCredit: availableCredit(creditLimit, balance),
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

const CUSTOMER_DEFAULT_PAGE_SIZE = 30;

/**
 * Lista los clientes de la organización, con búsqueda por nombre o teléfono.
 * El teléfono guardado está normalizado a 8 dígitos, así que la búsqueda
 * también normaliza el texto antes de comparar.
 */
export async function listCustomers(
  organizationId: string,
  options: CustomerListQuery = {},
): Promise<Paginated<CustomerListItem>> {
  const page = Math.max(options.page ?? 1, 1);
  const pageSize = Math.min(options.pageSize ?? CUSTOMER_DEFAULT_PAGE_SIZE, 100);
  const search = options.search?.trim().replace(/[\s-]/g, "") ?? "";

  const conditions = [eq(schema.customers.organizationId, organizationId)];
  if (search) {
    conditions.push(
      or(
        ilike(schema.customers.firstName, `%${search}%`),
        ilike(schema.customers.lastName, `%${search}%`),
        ilike(schema.customers.phone, `%${search}%`),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.customers)
    .where(whereClause);
  const count = countRows[0]?.count ?? 0;

  const rows = await db
    .select()
    .from(schema.customers)
    .where(whereClause)
    .orderBy(asc(schema.customers.lastName), asc(schema.customers.firstName))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { items: rows.map(toCustomerListItem), total: count, page, pageSize };
}

export async function getCustomerDetail(organizationId: string, id: string): Promise<CustomerListItem> {
  const [row] = await db
    .select()
    .from(schema.customers)
    .where(and(eq(schema.customers.id, id), eq(schema.customers.organizationId, organizationId)))
    .limit(1);
  if (!row) throw new NotFoundError("Cliente no encontrado");
  return toCustomerListItem(row);
}

/**
 * El mostrador fija el techo del fiado y/o mueve el saldo (un abono del cliente
 * es un ajuste negativo). El saldo nunca se deja en negativo: si el cliente
 * abona de más, el excedente simplemente se ignora y se cierra en 0.
 */
export async function updateCustomerCredit(
  organizationId: string,
  id: string,
  input: CustomerCreditUpdateInput,
): Promise<CustomerListItem> {
  const [existing] = await db
    .select()
    .from(schema.customers)
    .where(and(eq(schema.customers.id, id), eq(schema.customers.organizationId, organizationId)))
    .limit(1);
  if (!existing) throw new NotFoundError("Cliente no encontrado");

  const currentBalance = fromQuantity(existing.balance);
  const adjustment = input.balanceAdjustment ?? 0;
  const nextBalance = Math.max(0, currentBalance + adjustment);

  const [updated] = await db
    .update(schema.customers)
    .set({
      ...(input.creditLimit !== undefined ? { creditLimit: input.creditLimit.toFixed(2) } : {}),
      ...(input.balanceAdjustment !== undefined ? { balance: nextBalance.toFixed(2) } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.customers.id, id), eq(schema.customers.organizationId, organizationId)))
    .returning();

  if (!updated) throw new NotFoundError("Cliente no encontrado");
  return toCustomerListItem(updated);
}
