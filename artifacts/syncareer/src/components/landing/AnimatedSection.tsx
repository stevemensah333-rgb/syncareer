import { ReactNode, useEffect, useRef, useState } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Vertical offset to animate from. Defaults to a restrained 8px. */
  y?: number;
}

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState<boolean>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduce(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduce;
}

/**
 * Reusable scroll-reveal wrapper: a soft 150ms fade + rise that runs once
 * when the section scrolls into view. Implemented with an IntersectionObserver
 * and a CSS transition so the animation costs no JavaScript library weight —
 * framer-motion (~370 kB) was previously pulled into every page that wrapped
 * a section in this component.
 *
 * Respects prefers-reduced-motion (becomes a plain instant reveal). Falls
 * back to immediately visible when IntersectionObserver is unavailable.
 */
export default function AnimatedSection({
  children,
  className = "",
  delay = 0,
  y = 8,
}: AnimatedSectionProps) {
  const reduce = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const element = sectionRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      // Match the previous reveal threshold: trigger once the section is
      // 40px inside the viewport.
      { rootMargin: "-40px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  const clampedDelay = reduce ? 0 : Math.min(delay, 0.08);
  const transition = reduce
    ? "none"
    : `opacity 0.15s ease-out ${clampedDelay}s, transform 0.15s ease-out ${clampedDelay}s`;

  return (
    <div
      ref={sectionRef}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: !reduce && !visible ? `translateY(${y}px)` : undefined,
        transition,
      }}
    >
      {children}
    </div>
  );
}
