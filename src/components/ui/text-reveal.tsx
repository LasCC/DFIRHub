import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface TextRevealProps {
  children: string;
  className?: string;
  blur?: number;
  delay?: number;
  duration?: number;
  from?: "top" | "bottom";
  split?: "word" | "letter";
}

export const TextReveal = ({
  children,
  className,
  blur = 10,
  delay = 0.1,
  duration = 1,
  from = "bottom",
  split = "word",
}: TextRevealProps) => {
  const rawSegments =
    split === "word" ? children.split(" ") : children.split(/(?=.)/);

  let offset = 0;
  const segments = rawSegments.map((segment) => {
    const key = `${offset}-${segment}`;
    offset += segment.length + (split === "word" ? 1 : 0);
    return { key, value: segment };
  });

  return (
    <div>
      {segments.map((segment, index) => (
        <motion.span
          key={segment.key}
          initial={{
            opacity: 0,
            y: from === "bottom" ? "50%" : "-50%",
            filter: `blur(${blur}px)`,
          }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            delay: index * delay,
            duration,
            ease: [0.18, 0.89, 0.82, 1.04],
          }}
          className={cn(
            "inline-flex leading-none",
            split === "word" ? "mr-[0.2em]" : "",
            className
          )}
        >
          {segment.value === " " ? "\u00A0" : segment.value}
        </motion.span>
      ))}
      <div className="sr-only">{children}</div>
    </div>
  );
};
