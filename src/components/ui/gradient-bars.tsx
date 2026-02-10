import { motion } from "framer-motion";

interface GradientBarsProps {
  bars?: number;
  colors?: string[];
  className?: string;
}

export const GradientBars = ({
  bars = 20,
  colors = ["rgba(16,185,129,0.2)", "rgba(6,182,212,0.08)", "transparent"],
  className,
}: GradientBarsProps) => {
  const gradientStyle = `linear-gradient(to top, ${colors.join(", ")})`;

  return (
    <div
      className={`absolute inset-0 z-0 overflow-hidden ${className ?? ""}`.trim()}
    >
      <div className="flex h-full w-full">
        {Array.from({ length: bars }).map((_, index) => {
          const position = bars > 1 ? index / (bars - 1) : 0;
          const center = 0.5;
          const distance = Math.abs(position - center);
          const scale = 0.3 + 0.7 * (distance * 2) ** 1.2;

          return (
            <motion.div
              key={`bg-bar-${position.toFixed(5)}`}
              className="flex-1 origin-bottom"
              style={{ background: gradientStyle }}
              animate={{
                scaleY: [scale, scale + 0.1, scale],
                opacity: [1, 0.95, 1],
              }}
              transition={{
                duration: 3,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "mirror",
                delay: index * 0.06,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
