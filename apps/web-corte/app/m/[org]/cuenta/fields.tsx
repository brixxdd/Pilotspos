"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const baseInput =
  "w-full rounded-2xl border border-line bg-app px-4 py-3.5 text-[15px] text-ink outline-none transition-all duration-200 placeholder:text-muted/60 focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  /** Mensaje del servidor para este campo. Sustituye a la pista mientras dure. */
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <div className={error ? "[&_input]:border-danger [&_textarea]:border-danger" : undefined}>
        {children}
      </div>
      {error ? (
        <span className="animate-rise mt-1.5 flex items-start gap-1.5 text-xs font-medium leading-relaxed text-danger">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0 fill-current">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3.25a.9.9 0 0 1 .9.9v3.4a.9.9 0 1 1-1.8 0v-3.4a.9.9 0 0 1 .9-.9Zm0 6.1a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
          </svg>
          {error}
        </span>
      ) : (
        hint && <span className="mt-1.5 block text-xs leading-relaxed text-muted">{hint}</span>
      )}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={baseInput} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseInput} min-h-[88px] resize-y leading-relaxed`} />;
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-accent px-6 py-4 text-[15px] font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
    >
      {pending ? "Un momento…" : children}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="animate-rise rounded-2xl border border-danger/25 bg-danger/[0.07] px-4 py-3 text-sm font-medium text-danger"
    >
      {message}
    </p>
  );
}
