import type { HTMLAttributes } from "react";
import { cn } from "./cn.js";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-line bg-white p-5 shadow-sm", className)}
      {...props}
    />
  );
}
