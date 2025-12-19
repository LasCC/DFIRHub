import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	{
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
				windows: "bg-blue-900/50 text-blue-200 border-blue-700",
				linux: "bg-orange-900/50 text-orange-200 border-orange-700",
				macos: "bg-slate-700/50 text-slate-200 border-slate-600",
				// Category variants
				execution: "bg-red-900/50 text-red-200 border-red-700",
				persistence: "bg-orange-900/50 text-orange-200 border-orange-700",
				lateral: "bg-purple-900/50 text-purple-200 border-purple-700",
				browser: "bg-blue-900/50 text-blue-200 border-blue-700",
				file: "bg-green-900/50 text-green-200 border-green-700",
				account: "bg-cyan-900/50 text-cyan-200 border-cyan-700",
				network: "bg-indigo-900/50 text-indigo-200 border-indigo-700",
				usb: "bg-yellow-900/50 text-yellow-200 border-yellow-700",
				// Special variants
				lolbin: "bg-red-600/80 text-white border-red-500 font-bold",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
