import { cookies } from "next/headers";
import { requirePermission } from "@/lib/guards";
import { ProductsClient } from "./ProductsClient";
import type { CategoryRow, ProductRow } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

async function apiGet<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { cookie: cookies().toString() },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

export default async function ProductsPage() {
  const user = await requirePermission("products.manage");

  const [productsResult, categoriesResult] = await Promise.all([
    apiGet<{ items: ProductRow[] }>("/products?pageSize=100"),
    apiGet<{ categories: CategoryRow[] }>("/categories"),
  ]);

  return (
    <ProductsClient
      initialProducts={productsResult?.items ?? []}
      categories={categoriesResult?.categories ?? []}
      role={user.role}
    />
  );
}
