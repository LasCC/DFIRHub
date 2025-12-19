import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	[
		// Base styles
		"inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium cursor-pointer",
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
		variants: {
			variant: {
				default: [
					"bg-primary text-primary-foreground",
					"hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20",
					"focus-visible:shadow-lg focus-visible:shadow-primary/30",
				].join(" "),
				destructive: [
					"bg-destructive text-destructive-foreground",
					"hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/20",
					"focus-visible:shadow-lg focus-visible:shadow-destructive/30",
				].join(" "),
				outline: [
					"border border-input bg-background",
					"hover:bg-secondary hover:text-foreground hover:border-primary/50",
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
					"hover:bg-primary/10 hover:border-primary hover:shadow-lg hover:shadow-primary/10",
					"focus-visible:border-primary focus-visible:bg-primary/15 focus-visible:shadow-primary/20",
				].join(" "),
			},
			size: {
				default: "h-10 px-4 py-2 rounded-sm",
				sm: "h-8 px-3 text-xs rounded-sm",
				lg: "h-11 px-6 rounded-sm",
				xl: "h-12 px-8 text-base rounded-sm",
				icon: "h-10 w-10 rounded-sm",
				"icon-sm": "h-8 w-8 rounded-sm",
				"icon-lg": "h-12 w-12 rounded-sm",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
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
		ref,
	) => {
		const Comp = asChild ? Slot : "button";

		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				disabled={disabled || loading}
				aria-busy={loading}
				{...props}
			>
				{loading && (
					<span
						className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
						aria-hidden="true"
					/>
				)}
				{children}
			</Comp>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
