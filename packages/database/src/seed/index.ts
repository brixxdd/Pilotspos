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
const DEV_CASHIER_PASSWORD = "Cajero123!";

async function main() {
  console.log("Sembrando datos de desarrollo...");

  const [organization] = await db
    .insert(schema.organizations)
    .values({ name: "Mini Súper San José", slug: "mini-super-san-jose" })
    .returning();
  if (!organization) throw new Error("No se pudo crear la organización");

  const [branch] = await db
    .insert(schema.branches)
    .values({
      organizationId: organization.id,
      name: "Centro",
      slug: "centro",
      address: "Av. Principal 123, Centro",
    })
    .returning();
  if (!branch) throw new Error("No se pudo crear la sucursal");

  const [register1, register2] = await db
    .insert(schema.registers)
    .values([
      { organizationId: organization.id, branchId: branch.id, name: "Caja 01" },
      { organizationId: organization.id, branchId: branch.id, name: "Caja 02" },
    ])
    .returning();
  if (!register1 || !register2) throw new Error("No se pudieron crear las cajas");

  const [adminUser] = await db
    .insert(schema.users)
    .values({
      organizationId: organization.id,
      branchId: branch.id,
      username: "admin",
      passwordHash: await bcrypt.hash(DEV_ADMIN_PASSWORD, 10),
      fullName: "Administrador General",
      role: "ADMIN",
    })
    .returning();

  const [cashierUser] = await db
    .insert(schema.users)
    .values({
      organizationId: organization.id,
      branchId: branch.id,
      username: "cajero01",
      passwordHash: await bcrypt.hash(DEV_CASHIER_PASSWORD, 10),
      fullName: "Ana López",
      role: "CASHIER",
    })
    .returning();
  if (!adminUser || !cashierUser) throw new Error("No se pudieron crear los usuarios");

  const categoryNames = ["Bebidas", "Lácteos", "Panadería", "Abarrotes", "Botanas"];
  const insertedCategories = await db
    .insert(schema.categories)
    .values(categoryNames.map((name) => ({ organizationId: organization.id, name })))
    .returning();
  const categoryByName = new Map(insertedCategories.map((c) => [c.name, c] as const));

  const productSeed = [
    {
      name: "Refresco Jarritos 600ml",
      category: "Bebidas",
      sku: "BEB-JARR-600",
      price: 22,
      cost: 14,
      stock: 48,
      minimumStock: 12,
      barcodes: ["7501234560016"],
    },
    {
      name: "Huevo blanco docena",
      category: "Abarrotes",
      sku: "ABA-HUEV-DOC",
      price: 45,
      cost: 34,
      stock: 30,
      minimumStock: 8,
      barcodes: ["7501234560023"],
    },
    {
      name: "Leche entera 1L",
      category: "Lácteos",
      sku: "LAC-LECH-001",
      price: 26,
      cost: 20,
      stock: 40,
      minimumStock: 10,
      barcodes: ["7501234560030"],
    },
    {
      name: "Pan blanco familiar",
      category: "Panadería",
      sku: "PAN-BLAN-FAM",
      price: 38,
      cost: 27,
      stock: 20,
      minimumStock: 6,
      barcodes: ["7501234560047"],
    },
    {
      name: "Catsup 400g",
      category: "Abarrotes",
      sku: "ABA-CATS-400",
      price: 32,
      cost: 21,
      stock: 25,
      minimumStock: 5,
      barcodes: ["7501234560054"],
    },
    {
      name: "Coca-Cola 600ml",
      category: "Bebidas",
      sku: "BEB-COCA-600",
      price: 20,
      cost: 13,
      stock: 60,
      minimumStock: 15,
      barcodes: ["7501234560061"],
    },
    {
      name: "Coca-Cola 1.5L",
      category: "Bebidas",
      sku: "BEB-COCA-150",
      price: 32,
      cost: 22,
      stock: 35,
      minimumStock: 10,
      barcodes: ["7501234560078"],
    },
    {
      name: "Coca-Cola 2L",
      category: "Bebidas",
      sku: "BEB-COCA-200",
      price: 38,
      cost: 27,
      stock: 25,
      minimumStock: 8,
      barcodes: ["7501234560085"],
    },
    {
      name: "Sabritas Original 45g",
      category: "Botanas",
      sku: "BOT-SABR-045",
      price: 18,
      cost: 11,
      stock: 4,
      minimumStock: 10,
      barcodes: ["7501234560092"],
    },
  ] as const;

  for (const p of productSeed) {
    const category = categoryByName.get(p.category);
    const [product] = await db
      .insert(schema.products)
      .values({
        organizationId: organization.id,
        name: p.name,
        sku: p.sku,
        price: p.price.toFixed(2),
        cost: p.cost.toFixed(2),
        stock: p.stock,
        minimumStock: p.minimumStock,
        categoryId: category?.id ?? null,
      })
      .returning();
    if (!product) continue;

    await db.insert(schema.productBarcodes).values(
      p.barcodes.map((barcode) => ({ productId: product.id, barcode })),
    );

    await db.insert(schema.inventoryMovements).values({
      organizationId: organization.id,
      branchId: branch.id,
      productId: product.id,
      type: "INITIAL_STOCK",
      quantity: p.stock,
      userId: adminUser.id,
      note: "Stock inicial de desarrollo",
    });
  }

  console.log("Seed completado:");
  console.log(`  Organización: ${organization.name} (${organization.slug})`);
  console.log(`  Sucursal: ${branch.name}`);
  console.log(`  Cajas: ${register1.name}, ${register2.name}`);
  console.log("  Usuarios de desarrollo:");
  console.log(`    admin / ${DEV_ADMIN_PASSWORD}`);
  console.log(`    cajero01 / ${DEV_CASHIER_PASSWORD}`);
  console.log("  NO usar estas credenciales en producción.");
}

main()
  .catch((error) => {
    console.error("Error sembrando datos:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
