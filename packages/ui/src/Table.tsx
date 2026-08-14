import type { ReactNode, TableHTMLAttributes } from "react";
import { cn } from "./cn";

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-app text-left text-xs font-semibold uppercase tracking-wide text-muted">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function TableRow({ className, children }: { className?: string; children: ReactNode }) {
  return <tr className={cn("hover:bg-app/60", className)}>{children}</tr>;
}

export function TableHeaderCell({ className, children }: { className?: string; children: ReactNode }) {
  return <th className={cn("px-4 py-3 font-semibold", className)}>{children}</th>;
}

export function TableCell({ className, children }: { className?: string; children: ReactNode }) {
  return <td className={cn("px-4 py-3 text-ink", className)}>{children}</td>;
}
