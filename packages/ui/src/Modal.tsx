"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className={cn("w-full rounded-lg bg-white shadow-xl", SIZE_CLASSES[size])}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-ink"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        ) : null}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
