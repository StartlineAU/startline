"use client";

import { cn } from "@/lib/utils";

export function RegisterField({
  label,
  error,
  fieldKey,
  children,
}: {
  label: string;
  error?: string;
  fieldKey?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-invalid={error ? fieldKey : undefined}>
      <label
        className={cn(
          "font-headline text-[11px] font-bold uppercase tracking-widest block mb-1",
          error ? "text-red-400" : "text-muted"
        )}
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 font-headline text-[11px] font-medium text-red-400">{error}</p>
      )}
    </div>
  );
}
