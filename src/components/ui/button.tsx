import type { VariantProps } from "class-variance-authority";

import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    // Base styles
    "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm",
    // Transitions
    "transition-all duration-200 ease-out",
    // Focus styles - accessible and visible
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // Disabled states
    "disabled:pointer-events-none disabled:opacity-50",
    // Icon handling
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    // Active state feedback
    "active:scale-[0.98]",
  ].join(" "),
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-10 rounded-sm px-4 py-2",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-11 rounded-sm px-6",
        xl: "h-12 rounded-sm px-8 text-base",
        icon: "h-10 w-10 rounded-sm",
        "icon-sm": "h-8 w-8 rounded-sm",
        "icon-lg": "h-12 w-12 rounded-sm",
      },
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20",
          "focus-visible:shadow-lg focus-visible:shadow-primary/30",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground",
          "hover:bg-destructive/90 hover:shadow-destructive/20 hover:shadow-lg",
          "focus-visible:shadow-destructive/30 focus-visible:shadow-lg",
        ].join(" "),
        outline: [
          "border border-input bg-background",
          "hover:border-primary/50 hover:bg-secondary hover:text-foreground",
          "focus-visible:border-primary focus-visible:bg-secondary/50",
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/80 hover:text-foreground",
          "focus-visible:bg-secondary/80",
        ].join(" "),
        ghost: [
          "bg-transparent",
          "hover:bg-secondary hover:text-foreground",
          "focus-visible:bg-secondary/80",
        ].join(" "),
        link: [
          "text-primary underline-offset-4",
          "hover:underline",
          "focus-visible:underline",
        ].join(" "),
        // New terminal-style variant
        terminal: [
          "border border-primary/50 bg-primary/5 text-primary",
          "hover:border-primary hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/10",
          "focus-visible:border-primary focus-visible:bg-primary/15 focus-visible:shadow-primary/20",
        ].join(" "),
      },
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        aria-busy={loading}
        className={cn(buttonVariants({ className, size, variant }))}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
