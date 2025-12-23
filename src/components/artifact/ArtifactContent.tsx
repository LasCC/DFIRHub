import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

// Container animation variants
const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.06,
			delayChildren: 0.1,
		},
	},
};

// Individual section variants
const sectionVariants = {
	hidden: { opacity: 0, y: 16 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.5,
			ease: [0.16, 1, 0.3, 1],
		},
	},
};

// Breadcrumb slide-in variant
const breadcrumbVariants = {
	hidden: { opacity: 0, x: -20 },
	visible: {
		opacity: 1,
		x: 0,
		transition: {
			duration: 0.4,
			ease: [0.16, 1, 0.3, 1],
		},
	},
};

// Header scale-in variant
const headerVariants = {
	hidden: { opacity: 0, y: -10, scale: 0.98 },
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: {
			duration: 0.5,
			ease: [0.16, 1, 0.3, 1],
		},
	},
};

// Card variant with subtle scale
const cardVariants = {
	hidden: { opacity: 0, scale: 0.98 },
	visible: {
		opacity: 1,
		scale: 1,
		transition: {
			duration: 0.4,
			ease: [0.16, 1, 0.3, 1],
		},
	},
};

// Footer fade variant
const footerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			duration: 0.6,
			delay: 0.1,
		},
	},
};

// Reduced motion variants (instant, no animation)
const reducedContainerVariants = {
	hidden: { opacity: 1 },
	visible: { opacity: 1 },
};

const reducedItemVariants = {
	hidden: { opacity: 1, y: 0, x: 0, scale: 1 },
	visible: { opacity: 1, y: 0, x: 0, scale: 1 },
};

// Main wrapper
export function ArtifactPageContainer({ children }: { children: ReactNode }) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.div
			initial="hidden"
			animate="visible"
			variants={
				shouldReduceMotion ? reducedContainerVariants : containerVariants
			}
		>
			{children}
		</motion.div>
	);
}

// Breadcrumb navigation
export function ArtifactBreadcrumb({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<motion.nav
			variants={breadcrumbVariants}
			className={className}
			aria-label="Breadcrumb"
		>
			{children}
		</motion.nav>
	);
}

// Header section
export function ArtifactHeader({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<motion.header variants={headerVariants} className={className}>
			{children}
		</motion.header>
	);
}

// Generic section
export function ArtifactSection({
	children,
	className = "",
	ariaLabel,
}: {
	children: ReactNode;
	className?: string;
	ariaLabel?: string;
}) {
	return (
		<motion.section
			variants={sectionVariants}
			className={className}
			aria-labelledby={ariaLabel}
		>
			{children}
		</motion.section>
	);
}

// Card/Box section
export function ArtifactCard({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<motion.div variants={cardVariants} className={className}>
			{children}
		</motion.div>
	);
}

// Footer section
export function ArtifactFooter({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<motion.footer variants={footerVariants} className={className}>
			{children}
		</motion.footer>
	);
}

// List container with staggered children
const listVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.03,
		},
	},
};

const listItemVariants = {
	hidden: { opacity: 0, x: -10 },
	visible: {
		opacity: 1,
		x: 0,
		transition: {
			duration: 0.25,
			ease: "easeOut",
		},
	},
};

export function ArtifactList({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<motion.div variants={listVariants} className={className}>
			{children}
		</motion.div>
	);
}

export function ArtifactListItem({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<motion.div variants={listItemVariants} className={className}>
			{children}
		</motion.div>
	);
}

// Scroll reveal variants
const scrollRevealVariants: Variants = {
	hidden: { opacity: 0, y: 30 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.6,
			ease: [0.16, 1, 0.3, 1],
		},
	},
};

const scrollRevealStaggerVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
		},
	},
};

// Scroll reveal wrapper - reveals content when scrolled into view
export function ScrollReveal({
	children,
	className = "",
	delay = 0,
}: {
	children: ReactNode;
	className?: string;
	delay?: number;
}) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.div
			initial="hidden"
			whileInView="visible"
			viewport={{ once: true, margin: "-80px" }}
			variants={
				shouldReduceMotion
					? reducedItemVariants
					: {
							hidden: { opacity: 0, y: 30 },
							visible: {
								opacity: 1,
								y: 0,
								transition: {
									duration: 0.6,
									delay,
									ease: [0.16, 1, 0.3, 1],
								},
							},
						}
			}
			className={className}
		>
			{children}
		</motion.div>
	);
}

// Scroll reveal container with staggered children
export function ScrollRevealStagger({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.div
			initial="hidden"
			whileInView="visible"
			viewport={{ once: true, margin: "-50px" }}
			variants={
				shouldReduceMotion ? reducedContainerVariants : scrollRevealStaggerVariants
			}
			className={className}
		>
			{children}
		</motion.div>
	);
}

// Child item for ScrollRevealStagger
export function ScrollRevealItem({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<motion.div variants={scrollRevealVariants} className={className}>
			{children}
		</motion.div>
	);
}
