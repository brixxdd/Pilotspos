import { cookies } from "next/headers";
import { requireSession } from "@/lib/guards";
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
  const user = await requireSession();

  const [registersResult, sessionResult] = await Promise.all([
    apiGet<{ registers: RegisterRow[] }>("/cash/registers"),
    apiGet<{ session: CashSessionRow | null; summary: CashSummary | null; openedByName: string | null }>(
      "/cash/session",
    ),
  ]);

  return (
    <CashClient
      registers={registersResult?.registers ?? []}
      role={user.role}
      openedByName={sessionResult?.openedByName ?? null}
      initialSession={sessionResult?.session ?? null}
      initialSummary={sessionResult?.summary ?? null}
    />
  );
}
