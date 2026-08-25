import "../env.js";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema/index.js";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL no está definida. Revisa tu archivo .env.");
}

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

// Credenciales de DESARROLLO únicamente. Nunca usar en producción.
const DEV_ADMIN_PASSWORD = "Admin123!";
const DEV_MANAGER_PASSWORD = "Encargado123!";
const DEV_CASHIER_PASSWORD = "Cajero123!";

/**
 * Borra todos los datos transaccionales y de catálogo antes de sembrar.
 * El orden respeta las llaves foráneas: primero lo que depende, al final
 * lo que es referenciado.
 */
async function wipe() {
  console.log("Limpiando datos anteriores...");
  await db.delete(schema.payments);
  await db.delete(schema.saleItems);
  await db.delete(schema.sales);
  await db.delete(schema.inventoryMovements);
  await db.delete(schema.cashMovements);
  await db.delete(schema.cashSessions);
  await db.delete(schema.productBarcodes);
  await db.delete(schema.products);
  await db.delete(schema.categories);
  await db.delete(schema.suppliers);
  await db.delete(schema.users);
  await db.delete(schema.registers);
  await db.delete(schema.branches);
  await db.delete(schema.organizations);
}

/**
 * Catálogo real de carnicería. Todos los precios están en quetzales y las
 * carnes se venden POR LIBRA (`unit: "LB"`) — así trabaja el mostrador en
 * Guatemala y así marca la báscula. Sólo lo empacado va por pieza.
 */
const CATEGORIES = ["Res", "Cerdo", "Pollo", "Embutidos", "Vísceras", "Otros"] as const;

type Unit = "UNIT" | "LB";

interface SeedProduct {
  name: string;
  category: (typeof CATEGORIES)[number];
  sku: string;
  unit: Unit;
  price: number;
  cost: number;
  stock: number;
  minimumStock: number;
  barcodes?: string[];
}

const PRODUCTS: SeedProduct[] = [
  // ── Res ──────────────────────────────────────────────────────────────────
  { name: "Lomito de res", category: "Res", sku: "RES-LOMITO", unit: "LB", price: 52, cost: 41, stock: 34.5, minimumStock: 15 },
  { name: "Bistec de res", category: "Res", sku: "RES-BISTEC", unit: "LB", price: 38, cost: 29, stock: 48.25, minimumStock: 20 },
  { name: "Costilla de res", category: "Res", sku: "RES-COSTILLA", unit: "LB", price: 30, cost: 22, stock: 62.75, minimumStock: 25 },
  { name: "Carne molida de res", category: "Res", sku: "RES-MOLIDA", unit: "LB", price: 28, cost: 21, stock: 55, minimumStock: 25 },
  { name: "Carne para caldo (res)", category: "Res", sku: "RES-CALDO", unit: "LB", price: 24, cost: 17, stock: 40.5, minimumStock: 15 },
  { name: "Hueso de res", category: "Res", sku: "RES-HUESO", unit: "LB", price: 10, cost: 6, stock: 28, minimumStock: 10 },

  // ── Cerdo ────────────────────────────────────────────────────────────────
  { name: "Chuleta de cerdo", category: "Cerdo", sku: "CER-CHULETA", unit: "LB", price: 26, cost: 19, stock: 44.5, minimumStock: 18 },
  { name: "Costilla de cerdo", category: "Cerdo", sku: "CER-COSTILLA", unit: "LB", price: 24, cost: 17, stock: 38.25, minimumStock: 15 },
  { name: "Carne de cerdo para caldo", category: "Cerdo", sku: "CER-CALDO", unit: "LB", price: 20, cost: 14, stock: 30, minimumStock: 12 },
  { name: "Chicharrón", category: "Cerdo", sku: "CER-CHICHARRON", unit: "LB", price: 42, cost: 31, stock: 12.75, minimumStock: 8 },
  { name: "Manteca de cerdo", category: "Cerdo", sku: "CER-MANTECA", unit: "LB", price: 14, cost: 9, stock: 22, minimumStock: 10 },

  // ── Pollo ────────────────────────────────────────────────────────────────
  { name: "Pollo entero", category: "Pollo", sku: "POL-ENTERO", unit: "LB", price: 14, cost: 10, stock: 72.5, minimumStock: 30 },
  { name: "Pechuga de pollo", category: "Pollo", sku: "POL-PECHUGA", unit: "LB", price: 20, cost: 15, stock: 51.25, minimumStock: 20 },
  { name: "Muslo de pollo", category: "Pollo", sku: "POL-MUSLO", unit: "LB", price: 13, cost: 9, stock: 46, minimumStock: 20 },
  { name: "Alitas de pollo", category: "Pollo", sku: "POL-ALITAS", unit: "LB", price: 16, cost: 11, stock: 6.5, minimumStock: 15 },

  // ── Embutidos ────────────────────────────────────────────────────────────
  { name: "Chorizo artesanal", category: "Embutidos", sku: "EMB-CHORIZO", unit: "LB", price: 36, cost: 26, stock: 26.75, minimumStock: 12 },
  { name: "Longaniza", category: "Embutidos", sku: "EMB-LONGANIZA", unit: "LB", price: 32, cost: 23, stock: 18.5, minimumStock: 10 },
  { name: "Jamón de pierna", category: "Embutidos", sku: "EMB-JAMON", unit: "LB", price: 40, cost: 30, stock: 15.25, minimumStock: 8 },
  { name: "Salchicha", category: "Embutidos", sku: "EMB-SALCHICHA", unit: "LB", price: 22, cost: 15, stock: 20, minimumStock: 10 },
  { name: "Chorizo en ristra", category: "Embutidos", sku: "EMB-RISTRA", unit: "UNIT", price: 18, cost: 12, stock: 24, minimumStock: 10, barcodes: ["7401234500018"] },

  // ── Vísceras ─────────────────────────────────────────────────────────────
  { name: "Hígado de res", category: "Vísceras", sku: "VIS-HIGADO", unit: "LB", price: 18, cost: 12, stock: 14.5, minimumStock: 8 },
  { name: "Moronga", category: "Vísceras", sku: "VIS-MORONGA", unit: "LB", price: 22, cost: 15, stock: 9.25, minimumStock: 6 },
  { name: "Menudo / mondongo", category: "Vísceras", sku: "VIS-MENUDO", unit: "LB", price: 20, cost: 14, stock: 11, minimumStock: 6 },

  // ── Otros ────────────────────────────────────────────────────────────────
  { name: "Queso fresco", category: "Otros", sku: "OTR-QUESO", unit: "LB", price: 28, cost: 20, stock: 16.5, minimumStock: 8 },
  { name: "Crema (litro)", category: "Otros", sku: "OTR-CREMA", unit: "UNIT", price: 25, cost: 18, stock: 18, minimumStock: 8, barcodes: ["7401234500025"] },
  { name: "Cartón de huevos (30 u.)", category: "Otros", sku: "OTR-HUEVO-30", unit: "UNIT", price: 45, cost: 36, stock: 22, minimumStock: 10, barcodes: ["7401234500032"] },
  { name: "Bolsa para empaque", category: "Otros", sku: "OTR-BOLSA", unit: "UNIT", price: 1, cost: 0.4, stock: 500, minimumStock: 100 },
];

async function main() {
  await wipe();
  console.log("Sembrando CARNICERÍA GUERRA'S...");

  const [organization] = await db
    .insert(schema.organizations)
    .values({ name: "Carnicería Guerra's", slug: "carniceria-guerras" })
    .returning();
  if (!organization) throw new Error("No se pudo crear la organización");

  const branchRows = await db
    .insert(schema.branches)
    .values([
      {
        organizationId: organization.id,
        name: "Las Minas",
        slug: "las-minas",
        address: "Concepción Las Minas, Chiquimula",
      },
      {
        organizationId: organization.id,
        name: "La Hermita",
        slug: "la-hermita",
        address: "Concepción Las Minas, Chiquimula",
      },
    ])
    .returning();
  const [lasMinas, laHermita] = branchRows;
  if (!lasMinas || !laHermita) throw new Error("No se pudieron crear las sucursales");

  const registerRows = await db
    .insert(schema.registers)
    .values([
      { organizationId: organization.id, branchId: lasMinas.id, name: "Caja 01" },
      { organizationId: organization.id, branchId: laHermita.id, name: "Caja 01" },
    ])
    .returning();
  if (registerRows.length !== 2) throw new Error("No se pudieron crear las cajas");

  const [adminUser, managerUser, cashierUser] = await db
    .insert(schema.users)
    .values([
      {
        organizationId: organization.id,
        branchId: null,
        username: "admin",
        passwordHash: await bcrypt.hash(DEV_ADMIN_PASSWORD, 10),
        fullName: "Administrador General",
        role: "ADMIN",
      },
      {
        organizationId: organization.id,
        branchId: lasMinas.id,
        username: "encargado",
        passwordHash: await bcrypt.hash(DEV_MANAGER_PASSWORD, 10),
        fullName: "Encargado Las Minas",
        role: "MANAGER",
      },
      {
        organizationId: organization.id,
        branchId: lasMinas.id,
        username: "cajero01",
        passwordHash: await bcrypt.hash(DEV_CASHIER_PASSWORD, 10),
        fullName: "Ana López",
        role: "CASHIER",
      },
    ])
    .returning();
  if (!adminUser || !managerUser || !cashierUser) {
    throw new Error("No se pudieron crear los usuarios");
  }

  const insertedCategories = await db
    .insert(schema.categories)
    .values(CATEGORIES.map((name) => ({ organizationId: organization.id, name })))
    .returning();
  const categoryByName = new Map(insertedCategories.map((c) => [c.name, c] as const));

  for (const p of PRODUCTS) {
    const category = categoryByName.get(p.category);
    const [product] = await db
      .insert(schema.products)
      .values({
        organizationId: organization.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        price: p.price.toFixed(2),
        cost: p.cost.toFixed(2),
        stock: p.stock.toFixed(3),
        minimumStock: p.minimumStock.toFixed(3),
        categoryId: category?.id ?? null,
      })
      .returning();
    if (!product) continue;

    if (p.barcodes?.length) {
      await db.insert(schema.productBarcodes).values(
        p.barcodes.map((barcode) => ({ productId: product.id, barcode })),
      );
    }

    // Stock inicial únicamente en Las Minas. La Hermita arranca en cero para
    // que se vea el traslado/recepción real durante la implementación.
    await db.insert(schema.inventoryMovements).values({
      organizationId: organization.id,
      branchId: lasMinas.id,
      productId: product.id,
      type: "INITIAL_STOCK",
      quantity: p.stock.toFixed(3),
      userId: adminUser.id,
      note: "Stock inicial",
    });
  }

  console.log("\nSeed completado:");
  console.log(`  Organización: ${organization.name}`);
  console.log(`  Sucursales:   ${lasMinas.name}, ${laHermita.name}`);
  console.log(`  Categorías:   ${CATEGORIES.join(", ")}`);
  console.log(`  Productos:    ${PRODUCTS.length} (${PRODUCTS.filter((p) => p.unit === "LB").length} por libra)`);
  console.log("\n  Usuarios de desarrollo:");
  console.log(`    admin      / ${DEV_ADMIN_PASSWORD}   (ADMIN)`);
  console.log(`    encargado  / ${DEV_MANAGER_PASSWORD} (MANAGER)`);
  console.log(`    cajero01   / ${DEV_CASHIER_PASSWORD}  (CASHIER)`);
  console.log("\n  NO usar estas credenciales en producción.");
}

main()
  .catch((error) => {
    console.error("Error sembrando datos:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
