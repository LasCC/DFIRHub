import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // OS-specific variants
        windows: "border-blue-700 bg-blue-900/50 text-blue-200",
        linux: "border-orange-700 bg-orange-900/50 text-orange-200",
        macos: "border-slate-600 bg-slate-700/50 text-slate-200",
        // Category variants
        execution: "border-red-700 bg-red-900/50 text-red-200",
        persistence: "border-orange-700 bg-orange-900/50 text-orange-200",
        lateral: "border-purple-700 bg-purple-900/50 text-purple-200",
        browser: "border-blue-700 bg-blue-900/50 text-blue-200",
        file: "border-green-700 bg-green-900/50 text-green-200",
        account: "border-cyan-700 bg-cyan-900/50 text-cyan-200",
        network: "border-indigo-700 bg-indigo-900/50 text-indigo-200",
        usb: "border-yellow-700 bg-yellow-900/50 text-yellow-200",
      },
    },
  }
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
