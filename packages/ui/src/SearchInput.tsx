import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          ⌕
        </span>
        <input
          ref={ref}
          type="text"
          className={cn(
            "h-11 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm text-ink placeholder:text-muted",
            "focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
