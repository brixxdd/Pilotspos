export function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const percent = max > 0 ? Math.max((value / max) * 100, 2) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 flex-shrink-0 text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-app">
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-20 flex-shrink-0 text-right text-ink">${value.toFixed(2)}</span>
    </div>
  );
}
