import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "./cn.js";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-ink">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-10 rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-muted",
            "focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent",
            "disabled:bg-app disabled:text-muted",
            error && "border-danger focus:ring-danger focus:border-danger",
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        {!error && hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
    );
  },
);
Input.displayName = "Input";
