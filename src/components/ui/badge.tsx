import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-blue text-white",
        secondary: "border-blue-200 bg-brand-blue-light text-brand-blue",
        eco: "border-emerald-200 bg-emerald-50 text-emerald-700",
        navy: "border-transparent bg-brand-navy text-white",
        warning: "border-amber-200 bg-amber-50 text-amber-800",
        outline: "border-slate-200 bg-white text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
