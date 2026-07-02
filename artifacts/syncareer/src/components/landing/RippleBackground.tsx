import { ReactNode, useRef } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  /** Base background color (behind the ripple). */
  base?: string;
  /** Ripple accent color, rgba/hex with alpha friendly. */
  accent?: string;
}

/**
 * Cursor-follow spotlight. Uses CSS custom properties updated via pointermove
 * so React does not re-render. The tiniest movement shifts the radial glow,
 * giving the section a soft "ripple" reaction to the cursor.
 */
export default function RippleBackground({
  children,
  className = "",
  base = "#0a1512",
  accent = "rgba(0,196,204,0.18)",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundColor: base,
        // @ts-expect-error CSS custom prop
        "--mx": "50%",
        "--my": "50%",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at var(--mx) var(--my), ${accent}, transparent 60%)`,
        }}
      />
      {children}
    </div>
  );
}
