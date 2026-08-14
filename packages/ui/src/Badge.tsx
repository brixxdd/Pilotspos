import type { ReactNode } from "react";
import { cn } from "./cn.js";

export type BadgeTone = "neutral" | "success" | "danger" | "warning" | "info";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-app text-ink border-line",
  success: "bg-success/10 text-success border-success/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info: "bg-blue-secondary/10 text-blue-secondary border-blue-secondary/20",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
