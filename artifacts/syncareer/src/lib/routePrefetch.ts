// Idle-time prefetch of likely-next route chunks so first click feels instant.
// Each importer must match the dynamic import() used in App.tsx so Vite/Rollup
// dedupes to the same chunk.

type Importer = () => Promise<unknown>;

const runWhenIdle = (task: () => void, timeout = 2500) => {
  if (typeof window === "undefined") return;
  const ric = (window as any).requestIdleCallback;
  if (typeof ric === "function") {
    ric(task, { timeout });
  } else {
    setTimeout(task, 800);
  }
};

const prefetched = new Set<Importer>();

export function prefetch(importer: Importer) {
  if (prefetched.has(importer)) return;
  prefetched.add(importer);
  runWhenIdle(() => {
    importer().catch(() => prefetched.delete(importer));
  });
}

// Public / unauth landing → most likely next stops
export const prefetchLandingRoutes = () => {
  prefetch(() => import("@/pages/Assessment"));
  prefetch(() => import("@/components/auth/SignInForm"));
  prefetch(() => import("@/components/auth/SignUpForm"));
  prefetch(() => import("@/pages/Pricing"));
};

// Signed-in student → warm the primary tabs
export const prefetchStudentRoutes = () => {
  prefetch(() => import("@/pages/Dashboard"));
  prefetch(() => import("@/pages/Markets"));
  prefetch(() => import("@/pages/CVBuilder"));
  prefetch(() => import("@/pages/Portfolio"));
  prefetch(() => import("@/pages/AICoach"));
  prefetch(() => import("@/pages/Analysis"));
};

export const prefetchCounsellorRoutes = () => {
  prefetch(() => import("@/pages/counsellor/CounsellorDashboard"));
  prefetch(() => import("@/pages/counsellor/CounsellorSessions"));
  prefetch(() => import("@/pages/counsellor/CounsellorClients"));
  prefetch(() => import("@/pages/counsellor/CounsellorAvailability"));
};
