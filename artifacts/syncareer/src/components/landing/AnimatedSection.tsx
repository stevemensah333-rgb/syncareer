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

function useSupportsScrollDrivenAnimations(): boolean {
  const [supports, setSupports] = useState<boolean>(false);

  useEffect(() => {
    if (
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline", "view()")
    ) {
      setSupports(true);
    }
  }, []);

  return supports;
}

/**
 * Reusable scroll-reveal wrapper: a soft 150ms fade + rise that runs once
 * when the section scrolls into view.
 *
 * Uses CSS scroll-driven animations (`animation-timeline: view()`) where the
 * browser supports them, falling back to IntersectionObserver + CSS transitions
 * for broader compatibility.
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
  const supportsScrollDriven = useSupportsScrollDrivenAnimations();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible || supportsScrollDriven) return;
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
  }, [visible, supportsScrollDriven]);

  // If CSS scroll-driven animations are supported, use them — no JS state
  // needed; the browser handles the animation timeline natively.
  if (supportsScrollDriven && !reduce) {
    return (
      <div
        ref={sectionRef}
        className={`scroll-reveal ${className}`}
        style={{
          animationDelay: delay ? `${delay}s` : undefined,
        }}
      >
        {children}
      </div>
    );
  }

  // Fallback: IntersectionObserver + CSS transition
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
