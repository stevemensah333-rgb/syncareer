import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <main
      id="main-content"
      className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden"
      style={{ backgroundColor: "hsl(var(--landing-cream))" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ backgroundColor: "hsl(var(--landing-amber) / 0.18)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full blur-3xl"
        style={{ backgroundColor: "hsl(var(--primary) / 0.07)" }}
      />
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur px-3.5 py-1.5 text-[11px] font-medium text-foreground/70 shadow-sm ring-1 ring-black/[0.04] mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Lost in the stacks
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-normal leading-[1.05] tracking-[-0.02em] text-foreground text-center">
          This page took{" "}
          <span className="italic text-primary">a wrong turn</span>
        </h1>
        <p className="mt-4 max-w-sm text-center text-foreground/60 text-sm sm:text-base leading-relaxed">
          We can't find what you were looking for. The link may be old, or the page may have moved — let's get you back on track.
        </p>
        <div className="mt-10 w-full flex flex-col items-center gap-3">
          <Link
            to={`${basePath}/`}
            className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90 w-full sm:w-auto sm:min-w-[220px]"
          >
            Back to home
          </Link>
          <Link
            to={`${basePath}/sign-in`}
            className="inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            Sign in instead
          </Link>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
