import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-headline text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-1",
  {
    variants: {
      variant: {
        default:  "bg-white/10 text-white/50",
        live:     "bg-lime-500/20 text-lime-400",
        pending:  "bg-blue-500/20 text-blue-400",
        draft:    "bg-white/10 text-white/50",
        rejected: "bg-red-500/20 text-red-400",
        archived: "bg-white/[0.06] text-white/30",
        primary:  "bg-primary text-dark",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
