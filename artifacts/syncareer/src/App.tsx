import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider, SignIn, SignUp, useAuth, useUser } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { UserProfileProvider } from "./contexts/UserProfileContext";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { LoadingFallback } from "./components/LoadingFallback";
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
    colorBackground: "hsl(0, 0%, 98%)",
    colorInput: "hsl(214.3, 31.8%, 91.4%)",
    colorInputForeground: "hsl(220, 14%, 10%)",
    colorNeutral: "hsl(220, 13%, 91%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-gray-900",
    headerSubtitle: "text-gray-500",
    socialButtonsBlockButtonText: "text-gray-700",
    formFieldLabel: "text-gray-700",
    footerActionLink: "text-primary",
    footerActionText: "text-gray-500",
    dividerText: "text-gray-400",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-green-600",
    alertText: "text-red-600",
    logoBox: "",
    logoImage: "",
    socialButtonsBlockButton: "border border-gray-200",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-white",
    formFieldInput: "bg-white border border-gray-200 text-gray-900",
    footerAction: "",
    dividerLine: "bg-gray-200",
    alert: "",
    otpCodeFieldInput: "bg-white border border-gray-200",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
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
