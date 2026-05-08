import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Vertical offset to animate from. Defaults to 32px. */
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
  y = 32,
}: AnimatedSectionProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
