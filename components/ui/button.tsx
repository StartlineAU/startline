import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-headline font-bold uppercase tracking-widest will-change-transform transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-dark-lighter text-white hover:bg-white/15 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl active:translate-y-0 active:scale-100 active:shadow-none",
        primary:
          "bg-gradient-to-br from-[rgb(194,236,119)] to-[rgb(179,225,83)] text-[rgb(31,31,31)] hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl active:translate-y-0 active:scale-100 active:shadow-none",
        outline:
          "border border-white/[0.12] bg-dark-light text-white/70 hover:border-white/25 hover:text-white hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl active:translate-y-0 active:scale-100 active:shadow-none",
        ghost:
          "text-white/50 hover:text-white hover:bg-white/10 hover:scale-[1.01] active:scale-100",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl active:translate-y-0 active:scale-100 active:shadow-none",
        lime:
          "border border-lime-500/50 bg-lime-500/15 text-lime-400 hover:bg-lime-500/25 hover:border-lime-500 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl active:translate-y-0 active:scale-100 active:shadow-none",
        machined:
          "bg-machined text-dark machined-button-shadow hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-x-0 active:translate-y-0",
        link: "text-lime-600 underline-offset-4 hover:underline",
      },
      size: {
        sm: "text-[11px] px-3 py-2 rounded-lg",
        default: "text-[13px] px-5 py-3 rounded-xl",
        lg: "text-sm px-6 py-4 rounded-xl",
        ctaLg: "text-sm px-8 py-4 rounded-xl",
        icon: "w-9 h-9 rounded-lg text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
