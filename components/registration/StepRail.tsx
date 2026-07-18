"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Select ticket", "Your details", "Review & pay"] as const;

export default function StepRail({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="flex items-start mb-7">
      {STEPS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "idle";
        return (
          <div key={label} className="contents">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-[30px] h-[30px] rounded-full flex items-center justify-center font-headline text-[11.5px] font-bold border-2 transition-all duration-300",
                  state === "done" && "bg-primary text-dark border-transparent",
                  state === "active" && "bg-primary/10 text-primary border-primary",
                  state === "idle" && "bg-dark-light text-muted-dark border-transparent"
                )}
              >
                {state === "done" ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : i + 1}
              </div>
              <div
                className={cn(
                  "font-headline text-[9px] font-bold uppercase tracking-[0.14em] whitespace-nowrap transition-colors",
                  state === "active" && "text-primary",
                  state === "done" && "text-muted",
                  state === "idle" && "text-muted-dark"
                )}
              >
                {label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mt-[15px] mx-1.5 min-w-4 transition-colors",
                  i < current ? "bg-primary" : "bg-dark-lighter"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
