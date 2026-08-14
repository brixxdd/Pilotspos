import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { CashClient } from "./CashClient";
import type { CashSessionRow, CashSummary, RegisterRow } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

async function apiGet<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { cookie: cookies().toString() },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

export default async function CashPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const [registersResult, sessionResult] = await Promise.all([
    apiGet<{ registers: RegisterRow[] }>("/cash/registers"),
    apiGet<{ session: CashSessionRow | null; summary: CashSummary | null }>("/cash/session"),
  ]);

  return (
    <CashClient
      registers={registersResult?.registers ?? []}
      initialSession={sessionResult?.session ?? null}
      initialSummary={sessionResult?.summary ?? null}
    />
  );
}
