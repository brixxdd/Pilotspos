import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "../../shared/db.js";
import { NotFoundError } from "../../shared/errors.js";
import { fromQuantity } from "../../shared/numeric.js";

/** Productos sin categoría se agrupan al final bajo este nombre. */
const UNCATEGORIZED = "Otros cortes";

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  /** Precio unitario: por libra si `unit === "LB"`, por pieza si `"UNIT"`. */
  price: number;
  unit: "UNIT" | "LB";
  available: boolean;
}

export interface PublicMenu {
  business: { name: string; slug: string };
  branch: { name: string; slug: string; address: string | null };
  /** Las demás sucursales, para el selector del menú. */
  branches: Array<{ name: string; slug: string }>;
  updatedAt: string;
  categories: Array<{ name: string; items: PublicMenuItem[] }>;
}

/**
 * Catálogo público de una sucursal, para el menú digital que el cliente final
 * abre desde su celular. Es la ÚNICA lectura de la API sin sesión, así que
 * expone solo lo que puede ver cualquiera en el mostrador: nombre, precio y si
 * hay existencia. Nunca costo, SKU, códigos de barras ni la cantidad en stock.
 */
export async function getPublicMenu(orgSlug: string, branchSlug: string): Promise<PublicMenu> {
  const [organization] = await db
    .select({ id: schema.organizations.id, name: schema.organizations.name, slug: schema.organizations.slug })
    .from(schema.organizations)
    .where(and(eq(schema.organizations.slug, orgSlug), eq(schema.organizations.active, true)))
    .limit(1);

  if (!organization) throw new NotFoundError("Negocio no encontrado");

  const branchRows = await db
    .select({
      name: schema.branches.name,
      slug: schema.branches.slug,
      address: schema.branches.address,
    })
    .from(schema.branches)
    .where(and(eq(schema.branches.organizationId, organization.id), eq(schema.branches.active, true)))
    .orderBy(asc(schema.branches.name));

  const branch = branchRows.find((row) => row.slug === branchSlug);
  if (!branch) throw new NotFoundError("Sucursal no encontrada");

  const productRows = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      description: schema.products.description,
      price: schema.products.price,
      unit: schema.products.unit,
      stock: schema.products.stock,
      categoryName: schema.categories.name,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(and(eq(schema.products.organizationId, organization.id), eq(schema.products.active, true)))
    .orderBy(asc(schema.categories.name), asc(schema.products.name));

  // El inventario es por organización, no por sucursal: el menú de cada
  // sucursal muestra el mismo catálogo. Cuando el stock se separe por sucursal
  // esta consulta filtra por `branch.id` y lo demás no cambia.
  const grouped = new Map<string, PublicMenuItem[]>();
  for (const row of productRows) {
    const key = row.categoryName ?? UNCATEGORIZED;
    const items = grouped.get(key) ?? [];
    items.push({
      id: row.id,
      name: row.name,
      description: row.description,
      price: fromQuantity(row.price),
      unit: row.unit,
      available: fromQuantity(row.stock) > 0,
    });
    grouped.set(key, items);
  }

  const categories = [...grouped.entries()]
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => {
      if (a.name === UNCATEGORIZED) return 1;
      if (b.name === UNCATEGORIZED) return -1;
      return a.name.localeCompare(b.name, "es");
    });

  return {
    business: { name: organization.name, slug: organization.slug },
    branch,
    branches: branchRows.map(({ name, slug }) => ({ name, slug })),
    updatedAt: new Date().toISOString(),
    categories,
  };
}

/**
 * Datos mínimos del negocio, para las pantallas de cuenta del menú digital
 * (entrar, registro, perfil) que no cuelgan de una sucursal concreta.
 */
export async function getPublicBusiness(orgSlug: string) {
  const [organization] = await db
    .select({
      id: schema.organizations.id,
      name: schema.organizations.name,
      slug: schema.organizations.slug,
    })
    .from(schema.organizations)
    .where(and(eq(schema.organizations.slug, orgSlug), eq(schema.organizations.active, true)))
    .limit(1);

  if (!organization) throw new NotFoundError("Negocio no encontrado");

  const branches = await db
    .select({ name: schema.branches.name, slug: schema.branches.slug })
    .from(schema.branches)
    .where(and(eq(schema.branches.organizationId, organization.id), eq(schema.branches.active, true)))
    .orderBy(asc(schema.branches.name));

  // El `id` interno no sale al público: el menú se mueve solo con slugs.
  return { business: { name: organization.name, slug: organization.slug }, branches };
}
