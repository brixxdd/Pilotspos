import type { ReactNode } from "react";
import { cn } from "./cn.js";

export type AlertTone = "info" | "success" | "danger" | "warning";

const TONE_CLASSES: Record<AlertTone, string> = {
  info: "bg-blue-secondary/10 border-blue-secondary/30 text-blue-secondary",
  success: "bg-success/10 border-success/30 text-success",
  danger: "bg-danger/10 border-danger/30 text-danger",
  warning: "bg-warning/10 border-warning/30 text-warning",
};

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
}

export function Alert({ tone = "info", title, children }: AlertProps) {
  return (
    <div className={cn("rounded-md border px-4 py-3 text-sm", TONE_CLASSES[tone])}>
      {title ? <p className="font-medium">{title}</p> : null}
      {children ? <div className={cn(title && "mt-1 opacity-90")}>{children}</div> : null}
    </div>
  );
}
