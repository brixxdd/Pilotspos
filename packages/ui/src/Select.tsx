import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "./cn.js";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={selectId} className="text-sm font-medium text-ink">
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "h-10 rounded-md border border-line bg-white px-3 text-sm text-ink",
            "focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent",
            "disabled:bg-app disabled:text-muted",
            error && "border-danger focus:ring-danger focus:border-danger",
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    );
  },
);
Select.displayName = "Select";
