import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[4px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "bg-paper text-ink hover:bg-white",
        outline: "border border-line bg-transparent text-paper hover:border-copper hover:text-white",
        ghost: "text-muted hover:bg-white/5 hover:text-paper",
        copper: "bg-copper text-ink hover:bg-[#ca9e6a]"
      },
      size: { default: "h-9 px-3", sm: "h-8 px-2.5 text-xs", icon: "h-9 w-9 p-0" }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
));
Button.displayName = "Button";
