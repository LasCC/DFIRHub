import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface AnimatedArtifactPageProps {
  children: ReactNode;
}

// Stagger container for the entire page
export function AnimatedArtifactPage({ children }: AnimatedArtifactPageProps) {
  return (
    <motion.div
      animate="visible"
      initial="hidden"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Individual section with fade + slide animation
export function AnimatedSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
    >
      {children}
    </motion.section>
  );
}

// Header with scale animation
export function AnimatedHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.header
      className={className}
      variants={{
        hidden: { opacity: 0, y: -10 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
    >
      {children}
    </motion.header>
  );
}

// Breadcrumb with slide animation
export function AnimatedBreadcrumb({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.nav
      className={className}
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: {
          opacity: 1,
          x: 0,
          transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
    >
      {children}
    </motion.nav>
  );
}

// Card/Box with subtle scale
export function AnimatedCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, scale: 0.98 },
        visible: {
          opacity: 1,
          scale: 1,
          transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// List with staggered items
export function AnimatedList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.03,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// List item
export function AnimatedListItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, x: -10 },
        visible: {
          opacity: 1,
          x: 0,
          transition: {
            duration: 0.25,
            ease: "easeOut",
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Footer with fade
export function AnimatedFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.footer
      className={className}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            duration: 0.5,
            delay: 0.2,
          },
        },
      }}
    >
      {children}
    </motion.footer>
  );
}
