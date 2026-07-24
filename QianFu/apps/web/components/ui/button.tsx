import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva("inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper disabled:pointer-events-none disabled:opacity-40", {
  variants: {
    variant: {
      default: "bg-copper text-ink hover:bg-[#cf8b50]",
      outline: "border border-line bg-transparent text-paper hover:border-copper hover:bg-copper/10",
      ghost: "text-muted hover:bg-paper/5 hover:text-paper",
      danger: "bg-alert text-paper hover:bg-[#cf5c4b]",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> {}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, ...props }, ref) => <button ref={ref} className={cn(variants({ variant }), className)} {...props} />);
Button.displayName = "Button";
