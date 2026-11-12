import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-brand-blue text-white shadow-sm hover:bg-brand-blue-hover active:scale-[0.99]",
        navy: "bg-brand-navy text-white shadow-sm hover:bg-slate-800 active:scale-[0.99]",
        eco: "bg-brand-green text-white shadow-sm hover:bg-green-700 active:scale-[0.99]",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-[0.99]",
        outline:
          "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 hover:text-brand-navy",
        secondary: "bg-brand-blue-light text-brand-blue hover:bg-blue-100/80",
        ghost: "text-slate-700 hover:bg-slate-100 hover:text-brand-navy",
        link: "text-brand-blue underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
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
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
