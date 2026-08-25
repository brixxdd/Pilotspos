import { and, asc, desc, eq, sql } from "drizzle-orm";
import { calculateCashDifference, calculateExpectedCash } from "@pilotspos/domain";
import { db, schema } from "../../shared/db.js";
import { AppError, ConflictError, NotFoundError } from "../../shared/errors.js";
import type { CashCloseInput, CashMovementInput, CashOpeningInput } from "@pilotspos/validation";

export async function listRegisters(organizationId: string, branchId: string | null) {
  const conditions = [eq(schema.registers.organizationId, organizationId), eq(schema.registers.active, true)];
  if (branchId) conditions.push(eq(schema.registers.branchId, branchId));

  return db
    .select()
    .from(schema.registers)
    .where(and(...conditions))
    .orderBy(asc(schema.registers.name));
}

async function sumMovements(sessionId: string, type: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${schema.cashMovements.amount}), 0)` })
    .from(schema.cashMovements)
    .where(and(eq(schema.cashMovements.cashSessionId, sessionId), eq(schema.cashMovements.type, type as never)));
  return Number(row?.total ?? 0);
}

async function sumPaymentsByMethod(sessionId: string, method: "CARD" | "TRANSFER"): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${schema.payments.amount}), 0)` })
    .from(schema.payments)
    .innerJoin(schema.sales, eq(schema.sales.id, schema.payments.saleId))
    .where(and(eq(schema.sales.cashSessionId, sessionId), eq(schema.payments.method, method)));
  return Number(row?.total ?? 0);
}

export async function getSessionSummary(session: typeof schema.cashSessions.$inferSelect) {
  const [cashSales, deposits, adjustments, withdrawals, refunds, cardSales, transferSales] = await Promise.all([
    sumMovements(session.id, "SALE"),
    sumMovements(session.id, "DEPOSIT"),
    sumMovements(session.id, "ADJUSTMENT"),
    sumMovements(session.id, "WITHDRAWAL"),
    sumMovements(session.id, "REFUND"),
    sumPaymentsByMethod(session.id, "CARD"),
    sumPaymentsByMethod(session.id, "TRANSFER"),
  ]);

  const expectedCash = calculateExpectedCash({
    openingAmount: Number(session.openingAmount),
    cashSales,
    deposits: deposits + adjustments,
    withdrawals,
    refunds,
  });

  return {
    openingAmount: Number(session.openingAmount),
    cashSales,
    cardSales,
    transferSales,
    deposits,
    withdrawals,
    refunds,
    expectedCash,
  };
}

/**
 * Busca el turno de caja abierto que le corresponde al usuario.
 *
 * La sesión pertenece a la CAJA, no a la persona: la caja es física y sólo
 * puede tener un turno abierto a la vez (ver la validación en `openSession`).
 * En una carnicería es normal que el dueño abra la caja con el fondo por la
 * mañana y la cajera opere ese mismo turno.
 *
 * Antes esta consulta filtraba por `userId` mientras `openSession` validaba
 * por `registerId`: si el admin abría la caja, la cajera veía "no tienes una
 * caja abierta" en Ventas y "esta caja ya tiene una sesión abierta" en Caja.
 * Las dos decían la verdad — el modelo era el inconsistente.
 *
 * Quien tiene sucursal asignada ve el turno abierto de su sucursal; quien no
 * la tiene (un admin global) sólo ve los turnos que abrió él.
 */
export async function getOpenSession(
  organizationId: string,
  userId: string,
  branchId: string | null,
  registerId?: string,
) {
  const conditions = [
    eq(schema.cashSessions.organizationId, organizationId),
    eq(schema.cashSessions.status, "OPEN"),
    branchId
      ? eq(schema.cashSessions.branchId, branchId)
      : eq(schema.cashSessions.userId, userId),
  ];
  if (registerId) conditions.push(eq(schema.cashSessions.registerId, registerId));

  const [session] = await db
    .select()
    .from(schema.cashSessions)
    .where(and(...conditions))
    .orderBy(desc(schema.cashSessions.openedAt))
    .limit(1);

  if (!session) return null;
  const summary = await getSessionSummary(session);
  const [openedBy] = await db
    .select({ fullName: schema.users.fullName })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);
  return { session, summary, openedByName: openedBy?.fullName ?? null };
}

export async function openSession(
  params: { organizationId: string; branchId: string; userId: string },
  input: CashOpeningInput,
) {
  const [register] = await db
    .select()
    .from(schema.registers)
    .where(
      and(
        eq(schema.registers.id, input.registerId),
        eq(schema.registers.organizationId, params.organizationId),
        eq(schema.registers.branchId, params.branchId),
      ),
    )
    .limit(1);
  if (!register) throw new NotFoundError("Caja no encontrada en tu sucursal");

  const [existingOpen] = await db
    .select({ id: schema.cashSessions.id, openedBy: schema.users.fullName })
    .from(schema.cashSessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.cashSessions.userId))
    .where(and(eq(schema.cashSessions.registerId, input.registerId), eq(schema.cashSessions.status, "OPEN")))
    .limit(1);
  if (existingOpen) {
    throw new ConflictError(
      `${register.name} ya tiene un turno abierto por ${existingOpen.openedBy}. Hay que cerrarlo antes de abrir uno nuevo.`,
    );
  }

  const session = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(schema.cashSessions)
      .values({
        organizationId: params.organizationId,
        branchId: params.branchId,
        registerId: input.registerId,
        userId: params.userId,
        openingAmount: input.openingAmount.toFixed(2),
        status: "OPEN",
      })
      .returning();
    if (!created) throw new Error("No se pudo abrir la caja");

    await tx.insert(schema.cashMovements).values({
      organizationId: params.organizationId,
      cashSessionId: created.id,
      type: "OPENING",
      amount: input.openingAmount.toFixed(2),
      userId: params.userId,
      note: "Apertura de caja",
    });

    return created;
  });

  const summary = await getSessionSummary(session);
  return { session, summary };
}

/** Igual criterio que `getOpenSession`: el turno es de la caja/sucursal, no de la persona. */
export async function getCurrentOpenSession(
  organizationId: string,
  userId: string,
  branchId: string | null,
) {
  const [session] = await db
    .select()
    .from(schema.cashSessions)
    .where(
      and(
        eq(schema.cashSessions.organizationId, organizationId),
        eq(schema.cashSessions.status, "OPEN"),
        branchId
          ? eq(schema.cashSessions.branchId, branchId)
          : eq(schema.cashSessions.userId, userId),
      ),
    )
    .orderBy(desc(schema.cashSessions.openedAt))
    .limit(1);
  if (!session) throw new NotFoundError("No tienes una sesión de caja abierta");
  return session;
}

export async function addMovement(
  params: { organizationId: string; userId: string; branchId: string | null },
  input: CashMovementInput,
) {
  const session = await getCurrentOpenSession(params.organizationId, params.userId, params.branchId);

  await db.insert(schema.cashMovements).values({
    organizationId: params.organizationId,
    cashSessionId: session.id,
    type: input.type,
    amount: input.amount.toFixed(2),
    userId: params.userId,
    note: input.note ?? null,
  });

  const summary = await getSessionSummary(session);
  return { summary };
}

export async function closeSession(
  params: { organizationId: string; userId: string; branchId: string | null },
  input: CashCloseInput,
) {
  const session = await getCurrentOpenSession(params.organizationId, params.userId, params.branchId);
  const summary = await getSessionSummary(session);
  const difference = calculateCashDifference(summary.expectedCash, input.countedCash);

  if (Math.abs(difference) > 0 && !input.note) {
    throw new AppError(
      "Hay una diferencia entre el efectivo esperado y el contado; agrega una nota explicando el motivo",
      400,
      "DIFFERENCE_REQUIRES_NOTE",
    );
  }

  const [updated] = await db
    .update(schema.cashSessions)
    .set({
      status: "CLOSED",
      closingAmount: input.countedCash.toFixed(2),
      expectedCash: summary.expectedCash.toFixed(2),
      countedCash: input.countedCash.toFixed(2),
      difference: difference.toFixed(2),
      closedAt: new Date(),
    })
    .where(eq(schema.cashSessions.id, session.id))
    .returning();

  return { session: updated, summary: { ...summary, countedCash: input.countedCash, difference } };
}
