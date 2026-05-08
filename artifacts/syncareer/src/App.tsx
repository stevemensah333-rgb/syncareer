import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ClerkProvider, SignIn, SignUp, useAuth, useUser } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { UserProfileProvider } from "./contexts/UserProfileContext";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { LoadingFallback } from "./components/LoadingFallback";
import OfflineBanner from "./components/OfflineBanner";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleRoute from "./components/auth/RoleRoute";
import AdminRoute from "./components/auth/AdminRoute";
import { setClerkSession } from "@/integrations/supabase/client";

// Lazy-loaded pages
const Landing = lazy(() => import("./pages/Landing"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const PublicPortfolio = lazy(() => import("./pages/PublicPortfolio"));
const Pricing = lazy(() => import("./pages/Pricing"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));

// Student pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Assessment = lazy(() => import("./pages/Assessment"));
const Learn = lazy(() => import("./pages/Learn"));
const Markets = lazy(() => import("./pages/Markets"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Analysis = lazy(() => import("./pages/Analysis"));
const AICoach = lazy(() => import("./pages/AICoach"));
const InterviewSimulator = lazy(() => import("./pages/InterviewSimulator"));
const ApplicationTracker = lazy(() => import("./pages/ApplicationTracker"));
const CVBuilder = lazy(() => import("./pages/CVBuilder"));

// Admin pages
const FeedbackDashboard = lazy(() => import("./pages/admin/FeedbackDashboard"));
const UsersDashboard = lazy(() => import("./pages/admin/UsersDashboard"));

// Shared pages
const Settings = lazy(() => import("./pages/Settings"));

// Employer pages
const MyCompany = lazy(() => import("./pages/employer/MyCompany"));
const PostJob = lazy(() => import("./pages/employer/PostJob"));
const HireWithAI = lazy(() => import("./pages/employer/HireWithAI"));
const ApplicantTracker = lazy(() => import("./pages/employer/ApplicantTracker"));

// Counsellor pages
const CounsellorDashboard = lazy(() => import("./pages/counsellor/CounsellorDashboard"));
const CounsellorAvailability = lazy(() => import("./pages/counsellor/CounsellorAvailability"));
const CounsellorSessions = lazy(() => import("./pages/counsellor/CounsellorSessions"));

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkAppearance = {
  theme: shadcn,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(181, 100%, 40%)",
    colorForeground: "hsl(220, 14%, 10%)",
    colorMutedForeground: "hsl(220, 8%, 46%)",
    colorDanger: "hsl(0, 84.2%, 60.2%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(214.3, 31.8%, 91.4%)",
    colorInputForeground: "hsl(220, 14%, 10%)",
    colorNeutral: "hsl(220, 13%, 91%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "9999px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-white/95 backdrop-blur rounded-3xl w-[440px] max-w-full overflow-hidden shadow-[0_20px_60px_-30px_rgba(20,20,20,0.25)] ring-1 ring-black/[0.04]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none !px-8 !py-8",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButtonText: "text-foreground/80",
    formFieldLabel: "text-foreground/70 text-xs uppercase tracking-wider",
    footerActionLink: "text-primary hover:text-primary/80",
    footerActionText: "text-foreground/60",
    dividerText: "text-foreground/40 text-xs uppercase tracking-wider",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-green-600",
    alertText: "text-red-600",
    logoBox: "mb-4",
    logoImage: "h-8",
    socialButtonsBlockButton:
      "!rounded-full border border-black/[0.08] bg-white hover:bg-foreground/[0.03] transition-colors h-11",
    formButtonPrimary:
      "!rounded-full bg-foreground hover:bg-foreground/90 text-background normal-case font-medium tracking-normal h-11 shadow-sm",
    formFieldInput:
      "!rounded-xl bg-white border border-black/[0.08] text-foreground h-11 focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
    footerAction: "",
    dividerLine: "bg-black/[0.06]",
    alert: "!rounded-xl",
    otpCodeFieldInput: "!rounded-lg bg-white border border-black/[0.08]",
    formFieldRow: "",
    main: "",
  },
};

function AuthShell({
  eyebrow,
  title,
  italicWord,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  italicWord: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const titleParts = title.split(italicWord);
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
          {eyebrow}
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-normal leading-[1.05] tracking-[-0.02em] text-foreground text-center">
          {titleParts[0]}
          <span className="italic text-primary">{italicWord}</span>
          {titleParts[1]}
        </h1>
        <p className="mt-4 max-w-sm text-center text-foreground/60 text-sm sm:text-base leading-relaxed">
          {subtitle}
        </p>
        <div className="mt-10 w-full flex justify-center">{children}</div>
      </div>
    </div>
  );
}

type AuthCopy = {
  eyebrow: string;
  title: string;
  italicWord: string;
  subtitle: string;
};

function getSignInCopy(pathname: string): AuthCopy {
  const sub = pathname.replace(`${basePath}/sign-in`, "").replace(/^\//, "").split("/")[0];
  if (sub === "factor-two" || sub === "factor-one" && pathname.includes("totp")) {
    return {
      eyebrow: "One more check",
      title: "Confirm it's really you",
      italicWord: "really you",
      subtitle: "Enter the code from your authenticator app or backup device to finish signing in.",
    };
  }
  if (sub === "reset-password" || sub === "reset-password-success") {
    return {
      eyebrow: "Almost there",
      title: "Choose a new password",
      italicWord: "new password",
      subtitle: "Pick something memorable — you'll use it next time you sign in to Syncareer.",
    };
  }
  if (sub === "forgot-password") {
    return {
      eyebrow: "No worries",
      title: "Reset your password",
      italicWord: "your password",
      subtitle: "Tell us the email on your account and we'll send a code to get you back in.",
    };
  }
  if (sub === "factor-one") {
    return {
      eyebrow: "Check your inbox",
      title: "Enter the code we sent",
      italicWord: "code we sent",
      subtitle: "We just emailed you a one-time code to confirm it's you.",
    };
  }
  return {
    eyebrow: "Welcome back",
    title: "Sign in to keep going",
    italicWord: "keep going",
    subtitle: "Pick up where you left off — your assessments, CV, and saved roles are waiting.",
  };
}

function getSignUpCopy(pathname: string): AuthCopy {
  const sub = pathname.replace(`${basePath}/sign-up`, "").replace(/^\//, "").split("/")[0];
  if (sub === "verify-email-address") {
    return {
      eyebrow: "Check your inbox",
      title: "Confirm your email",
      italicWord: "your email",
      subtitle: "We just sent a one-time code — pop it in below to finish setting up your account.",
    };
  }
  if (sub === "verify-phone-number") {
    return {
      eyebrow: "Quick check",
      title: "Confirm your number",
      italicWord: "your number",
      subtitle: "We sent a code by SMS — enter it below to verify your phone.",
    };
  }
  if (sub === "continue") {
    return {
      eyebrow: "Almost done",
      title: "A few more details",
      italicWord: "more details",
      subtitle: "Just a couple of things to finish setting up your Syncareer account.",
    };
  }
  return {
    eyebrow: "For African graduates",
    title: "Start your career story",
    italicWord: "career story",
    subtitle: "Take the free assessment, build an ATS-ready CV, and practise interviews — all in one place.",
  };
}

function SignInPage() {
  const { pathname } = useLocation();
  const copy = getSignInCopy(pathname);
  return (
    <AuthShell {...copy}>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthShell>
  );
}

function SignUpPage() {
  const { pathname } = useLocation();
  const copy = getSignUpCopy(pathname);
  return (
    <AuthShell {...copy}>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthShell>
  );
}

// Syncs Clerk session into the Supabase client shim so all existing supabase.auth.getSession() calls work
function AuthBridge() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      setClerkSession(null, null);
      return;
    }
    // Sync token into shim
    getToken().then((token) => {
      setClerkSession(
        {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? "",
          user_metadata: {
            full_name: user.fullName ?? "",
            avatar_url: user.imageUrl ?? "",
          },
          app_metadata: {},
        },
        token,
      );
    });
  }, [isLoaded, isSignedIn, user, getToken]);

  return null;
}

const AppContent = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthBridge />
      <OfflineBanner />
      <UserProfileProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Navigate to="/" replace />} />
              <Route path="/reset-password" element={<Navigate to="/sign-in" replace />} />
              <Route path="/sign-in/*" element={<SignInPage />} />
              <Route path="/sign-up/*" element={<SignUpPage />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/subscription-success" element={<SubscriptionSuccess />} />
              <Route path="/portfolio/:userId" element={<PublicPortfolio />} />
              <Route path="/terms" element={<TermsAndConditions />} />

              {/* Assessment is publicly accessible */}
              <Route path="/assessment" element={<Assessment />} />

              {/* Onboarding - any authenticated user */}
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

              {/* Shared routes */}
              <Route path="/settings" element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['student', 'employer', 'career_counsellor']}>
                    <Settings />
                  </RoleRoute>
                </ProtectedRoute>
              } />

              {/* Legacy redirect */}
              <Route path="/home" element={<Navigate to="/dashboard" replace />} />

              {/* STUDENT-ONLY ROUTES */}
              <Route path="/dashboard" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><Dashboard /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/learn" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><Learn /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/opportunities" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><Markets /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/portfolio" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><Portfolio /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/analysis" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><Analysis /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/ai-coach" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><AICoach /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/interview-simulator" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><InterviewSimulator /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/applications" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><ApplicationTracker /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/cv-builder" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><CVBuilder /></RoleRoute></ProtectedRoute>
              } />

              {/* EMPLOYER-ONLY ROUTES */}
              <Route path="/my-company" element={
                <ProtectedRoute><RoleRoute allowedRoles={['employer']}><MyCompany /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/post-job" element={
                <ProtectedRoute><RoleRoute allowedRoles={['employer']}><PostJob /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/hire-ai" element={
                <ProtectedRoute><RoleRoute allowedRoles={['employer']}><HireWithAI /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/applicants" element={
                <ProtectedRoute><RoleRoute allowedRoles={['employer']}><ApplicantTracker /></RoleRoute></ProtectedRoute>
              } />

              {/* COUNSELLOR-ONLY ROUTES */}
              <Route path="/counsellor-dashboard" element={
                <ProtectedRoute><RoleRoute allowedRoles={['career_counsellor']}><CounsellorDashboard /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/counsellor-availability" element={
                <ProtectedRoute><RoleRoute allowedRoles={['career_counsellor']}><CounsellorAvailability /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/counsellor-sessions" element={
                <ProtectedRoute><RoleRoute allowedRoles={['career_counsellor']}><CounsellorSessions /></RoleRoute></ProtectedRoute>
              } />

              {/* ADMIN ROUTES */}
              <Route path="/admin/feedback" element={
                <ProtectedRoute><AdminRoute><FeedbackDashboard /></AdminRoute></ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute><AdminRoute><UsersDashboard /></AdminRoute></ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </TooltipProvider>
      </UserProfileProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

const App = () => (
  <BrowserRouter>
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
    >
      <AppContent />
    </ClerkProvider>
  </BrowserRouter>
);

export default App;
