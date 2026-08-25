"use client";

import { useEffect, useState } from "react";
import type { SessionUser } from "@pilotspos/types";

const DATE_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export function Header({ user, onMenuClick }: { user: SessionUser; onMenuClick?: () => void }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-line bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            className="text-ink lg:hidden"
            aria-label="Abrir menú"
          >
            ☰
          </button>
        ) : null}
        <div className="text-sm text-muted">
          Cajero: <span className="font-medium text-ink">{user.fullName}</span>
        </div>
      </div>
      <div className="hidden text-sm text-muted sm:block">{now ? DATE_FORMATTER.format(now) : ""}</div>
    </header>
  );
}
