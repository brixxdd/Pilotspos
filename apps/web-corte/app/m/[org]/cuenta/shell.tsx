import Link from "next/link";
import type { ReactNode } from "react";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

export interface Business {
  business: { name: string; slug: string };
  branches: Array<{ name: string; slug: string }>;
}

export async function fetchBusiness(orgSlug: string): Promise<Business | null> {
  const response = await fetch(`${API_URL}/public/business/${orgSlug}`, {
    next: { revalidate: 300 },
  });
  if (!response.ok) return null;
  return response.json() as Promise<Business>;
}

/** Marco común de las tres pantallas de cuenta: entrar, registro y perfil. */
export function AccountShell({
  business,
  backHref,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  business: Business;
  backHref: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-app">
      <header className="menu-hero px-5 pb-12 pt-7 text-white sm:px-8 sm:pb-16 sm:pt-9">
        <div className="mx-auto max-w-lg">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
          >
            <span aria-hidden="true">←</span> {business.business.name}
          </Link>
          <p className="animate-rise mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-secondary">
            {eyebrow}
          </p>
          <h1 className="animate-rise mt-1 font-heading text-3xl font-bold leading-tight sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p
              className="animate-rise mt-2 max-w-md text-sm leading-relaxed text-white/60"
              style={{ animationDelay: "60ms" }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto -mt-8 max-w-lg px-4 pb-16 sm:px-6">
        <div className="animate-rise rounded-3xl border border-line bg-surface p-5 shadow-xl shadow-black/[0.06] sm:p-7">
          {children}
        </div>
      </main>
    </div>
  );
}
