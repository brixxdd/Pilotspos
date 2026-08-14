import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "../../shared/db.js";
import { UnauthorizedError } from "../../shared/errors.js";
import type { LoginInput } from "@pilotspos/validation";
import type { AuthContext } from "../../shared/auth-context.js";
import { createSession } from "./session.service.js";

export interface BootstrapBranch {
  id: string;
  name: string;
}

export interface BootstrapOrganization {
  id: string;
  name: string;
  slug: string;
  branches: BootstrapBranch[];
}

export async function getBootstrap(): Promise<{ organizations: BootstrapOrganization[] }> {
  const orgs = await db
    .select({ id: schema.organizations.id, name: schema.organizations.name, slug: schema.organizations.slug })
    .from(schema.organizations)
    .where(eq(schema.organizations.active, true))
    .orderBy(schema.organizations.name);

  const branches = await db
    .select({
      id: schema.branches.id,
      name: schema.branches.name,
      organizationId: schema.branches.organizationId,
    })
    .from(schema.branches)
    .where(eq(schema.branches.active, true))
    .orderBy(schema.branches.name);

  return {
    organizations: orgs.map((org) => ({
      ...org,
      branches: branches
        .filter((branch) => branch.organizationId === org.id)
        .map(({ id, name }) => ({ id, name })),
    })),
  };
}

export async function login(
  input: LoginInput,
): Promise<{ token: string; expiresAt: Date; context: AuthContext }> {
  const genericError = () => new UnauthorizedError("Usuario, organización o contraseña incorrectos");

  const [organization] = await db
    .select()
    .from(schema.organizations)
    .where(and(eq(schema.organizations.slug, input.organizationSlug), eq(schema.organizations.active, true)))
    .limit(1);
  if (!organization) throw genericError();

  const [user] = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.organizationId, organization.id),
        eq(schema.users.username, input.username),
        eq(schema.users.active, true),
      ),
    )
    .limit(1);
  if (!user) throw genericError();

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) throw genericError();

  // Si el usuario tiene una sucursal asignada, la sesión se ancla a esa
  // sucursal sin importar lo que envíe el cliente. Si no tiene una fija
  // (p. ej. un admin multi-sucursal), se respeta la sucursal elegida en el
  // login siempre que pertenezca a la misma organización.
  let branchId: string | null = user.branchId;
  if (!branchId && input.branchId) {
    const [branch] = await db
      .select({ id: schema.branches.id })
      .from(schema.branches)
      .where(and(eq(schema.branches.id, input.branchId), eq(schema.branches.organizationId, organization.id)))
      .limit(1);
    branchId = branch?.id ?? null;
  }

  const { token, expiresAt } = await createSession({
    userId: user.id,
    organizationId: organization.id,
    branchId,
  });

  let branchName: string | null = null;
  if (branchId) {
    const [branch] = await db
      .select({ name: schema.branches.name })
      .from(schema.branches)
      .where(eq(schema.branches.id, branchId))
      .limit(1);
    branchName = branch?.name ?? null;
  }

  const context: AuthContext = {
    sessionId: "", // no se expone al cliente
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    organizationId: organization.id,
    organizationName: organization.name,
    branchId,
    branchName,
  };

  return { token, expiresAt, context };
}
