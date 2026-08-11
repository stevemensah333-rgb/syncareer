import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Vertical offset to animate from. Defaults to a restrained 8px. */
  y?: number;
}

/**
 * Reusable scroll-reveal wrapper. Uses a soft cubic-bezier matched to the
 * Keitimas reference. Respects prefers-reduced-motion (becomes a plain fade).
 */
export default function AnimatedSection({
  children,
  className = "",
  delay = 0,
  y = 8,
}: AnimatedSectionProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: reduce ? 0 : 0.15, delay: reduce ? 0 : Math.min(delay, 0.08), ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
