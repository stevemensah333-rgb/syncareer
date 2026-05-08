import { motion, useReducedMotion } from "framer-motion";

/**
 * Soft editorial background: warm cream base, a single subtle teal radial
 * glow near the top, and a couple of very low-opacity floating blobs.
 * Replaces the old plain-white background to match the airy Keitimas feel.
 */
export default function LandingBackground() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{ backgroundColor: "hsl(var(--landing-cream))" }}
    >
      {/* Subtle teal radial glow near the top of the page */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 0%, hsl(var(--primary) / 0.06) 0%, transparent 70%)",
        }}
      />

      {/* Slow-floating amber blob, top-left */}
      <motion.div
        className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ backgroundColor: "hsl(var(--landing-amber) / 0.18)" }}
        animate={
          reduce
            ? undefined
            : { y: [0, 18, 0], x: [0, 12, 0] }
        }
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Slow-floating teal blob, mid-right */}
      <motion.div
        className="absolute top-1/2 -right-40 h-[32rem] w-[32rem] rounded-full blur-3xl"
        style={{ backgroundColor: "hsl(var(--primary) / 0.07)" }}
        animate={
          reduce
            ? undefined
            : { y: [0, -22, 0], x: [0, -10, 0] }
        }
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
