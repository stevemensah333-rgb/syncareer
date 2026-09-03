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
  prefetch(() => import("@/pages/Pricing"));
};

// Signed-in student → warm the primary tabs and the dossier routes they open
export const prefetchStudentRoutes = () => {
  prefetch(() => import("@/pages/Dashboard"));
  prefetch(() => import("@/pages/Markets"));
  prefetch(() => import("@/pages/ApplicationTracker"));
  prefetch(() => import("@/pages/ApplicationDossier"));
  prefetch(() => import("@/pages/mentorship/MentorDirectory"));
};

export const prefetchCounsellorRoutes = () => {
  prefetch(() => import("@/pages/mentorship/MentorAccount"));
  prefetch(() => import("@/pages/mentorship/MentorshipRequests"));
};
