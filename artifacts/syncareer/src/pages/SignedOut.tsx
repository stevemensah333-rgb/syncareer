import { Link } from "react-router-dom";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignedOut() {
  return (
    <div
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
          See you soon
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-normal leading-[1.05] tracking-[-0.02em] text-foreground text-center">
          You've been{" "}
          <span className="italic text-primary">signed out</span>
        </h1>
        <p className="mt-4 max-w-sm text-center text-foreground/60 text-sm sm:text-base leading-relaxed">
          Your session is closed safely. Pop back in whenever you're ready — your assessments, CV, and saved roles will be right where you left them.
        </p>
        <div className="mt-10 w-full flex flex-col items-center gap-3">
          <Link
            to={`${basePath}/sign-in`}
            className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90 w-full sm:w-auto sm:min-w-[220px]"
          >
            Sign back in
          </Link>
          <Link
            to={`${basePath}/`}
            className="inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            Back to home
          </Link>
          <p className="mt-4 text-center text-xs text-foreground/50">
            New here?{" "}
            <Link to={`${basePath}/sign-up`} className="text-primary hover:text-primary/80">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
