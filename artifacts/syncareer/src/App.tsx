import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { UserProfileProvider, useUserProfile } from "./contexts/UserProfileContext";
import { prefetchLandingRoutes, prefetchStudentRoutes, prefetchCounsellorRoutes } from "@/lib/routePrefetch";
import { usePageTracking } from "@/hooks/usePageTracking";
import { identifyAnalyticsUser, resetAnalyticsIdentity } from "@/services/analytics";
import { getPageTitle } from "@/lib/pageTitle";

import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { LoadingFallback } from "./components/LoadingFallback";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleRoute from "./components/auth/RoleRoute";
import AdminRoute from "./components/auth/AdminRoute";
import AuthShell from "./components/auth/AuthShell";
import SignInForm from "./components/auth/SignInForm";
import SignUpForm from "./components/auth/SignUpForm";
import ForgotPasswordForm from "./components/auth/ForgotPasswordForm";
import ResetPasswordForm from "./components/auth/ResetPasswordForm";

// Lazy-loaded pages
const Landing = lazy(() => import("./pages/Landing"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Pricing = lazy(() => import("./pages/Pricing"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const SignedOut = lazy(() => import("./pages/SignedOut"));

// Student pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Assessment = lazy(() => import("./pages/Assessment"));

const Markets = lazy(() => import("./pages/Markets"));
const Analysis = lazy(() => import("./pages/Analysis"));
const AICoach = lazy(() => import("./pages/AICoach"));
const InterviewSimulator = lazy(() => import("./pages/InterviewSimulator"));
const ApplicationTracker = lazy(() => import("./pages/ApplicationTracker"));
const ApplicationDossier = lazy(() => import("./pages/ApplicationDossier"));
const ApplicationCVEditor = lazy(() => import("./pages/ApplicationCVEditor"));
const CVBuilder = lazy(() => import("./pages/CVBuilder"));
const Build = lazy(() => import("./pages/Build"));
const Practice = lazy(() => import("./pages/Practice"));
const Apply = lazy(() => import("./pages/Apply"));

// Admin pages
const FeedbackDashboard = lazy(() => import("./pages/admin/FeedbackDashboard"));
const UsersDashboard = lazy(() => import("./pages/admin/UsersDashboard"));
const MentorVerification = lazy(() => import("./pages/admin/MentorVerification"));

// Shared pages
const Settings = lazy(() => import("./pages/Settings"));

const MentorDirectory = lazy(() => import("./pages/mentorship/MentorDirectory"));
const MentorDetails = lazy(() => import("./pages/mentorship/MentorDetails"));
const MentorshipRequests = lazy(() => import("./pages/mentorship/MentorshipRequests"));
const MentorAccount = lazy(() => import("./pages/mentorship/MentorAccount"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function SignInPage() {
  const { pathname } = useLocation();
  if (pathname.endsWith("/forgot-password")) {
    return (
      <AuthShell
        title="Reset your password"
        subtitle="Enter your email and we'll send instructions if it matches an account."
      >
        <ForgotPasswordForm />
      </AuthShell>
    );
  }
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your applications."
    >
      <SignInForm />
    </AuthShell>
  );
}

function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start building stronger, evidence-based applications."
    >
      <SignUpForm />
    </AuthShell>
  );
}

function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use at least eight characters and save it securely."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}

const RoutePrefetcher = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const { profile } = useUserProfile();
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      prefetchLandingRoutes();
      return;
    }
    if (profile?.user_type === "career_counsellor") prefetchCounsellorRoutes();
    else prefetchStudentRoutes();
  }, [isLoaded, isSignedIn, profile?.user_type]);
  return null;
};

const DocumentTitleManager = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = getPageTitle(pathname);
  }, [pathname]);
  return null;
};

const AnalyticsBridge = () => {
  usePageTracking();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { profile } = useUserProfile();
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !userId) { resetAnalyticsIdentity(); return; }
    const role = profile?.user_type === 'student' || profile?.user_type === 'career_counsellor' ? profile.user_type : 'unknown';
    void identifyAnalyticsUser(userId, role);
  }, [isLoaded, isSignedIn, profile?.user_type, userId]);
  return null;
};

const AppContent = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      
      <UserProfileProvider>
        <TooltipProvider>
          <RoutePrefetcher />
          <DocumentTitleManager />
          <AnalyticsBridge />
          <Toaster />
            <Sonner />
            <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Navigate to="/sign-in" replace />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/sign-in/*" element={<SignInPage />} />
              <Route path="/sign-up/*" element={<SignUpPage />} />
              <Route path="/signed-out" element={<SignedOut />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/subscription-success" element={<SubscriptionSuccess />} />
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />

              {/* Assessment is publicly accessible */}
              <Route path="/assessment" element={<Assessment />} />

              {/* Onboarding - any authenticated user */}
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

              {/* Shared routes */}
              <Route path="/settings" element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['student', 'career_counsellor']}>
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
              <Route path="/opportunities" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><Markets /></RoleRoute></ProtectedRoute>
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
              <Route path="/applications/:applicationId" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><ApplicationDossier /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/applications/:applicationId/cv" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><ApplicationCVEditor /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/cv-builder" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><CVBuilder /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/build" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><Build /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/practice" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><Practice /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/apply" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><Apply /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/mentors" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><MentorDirectory /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/mentors/:mentorId" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><MentorDetails /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/mentorship/requests" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student', 'career_counsellor']}><MentorshipRequests /></RoleRoute></ProtectedRoute>
              } />

              {/* MENTOR-ONLY ROUTES; the internal role remains career_counsellor. */}
              <Route path="/mentor/profile" element={
                <ProtectedRoute><RoleRoute allowedRoles={['career_counsellor']}><MentorAccount /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/mentor/availability" element={
                <ProtectedRoute><RoleRoute allowedRoles={['career_counsellor']}><MentorAccount /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/counsellor-dashboard" element={<Navigate to="/mentor/profile" replace />} />
              <Route path="/counsellor-availability" element={<Navigate to="/mentor/profile" replace />} />
              <Route path="/counsellor-sessions" element={<Navigate to="/mentorship/requests" replace />} />
              <Route path="/counsellor-clients" element={<Navigate to="/mentorship/requests" replace />} />
              <Route path="/counsellor/complete-credentials" element={<Navigate to="/mentor/profile" replace />} />

              {/* ADMIN ROUTES */}
              <Route path="/admin/feedback" element={
                <ProtectedRoute><AdminRoute><FeedbackDashboard /></AdminRoute></ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute><AdminRoute><UsersDashboard /></AdminRoute></ProtectedRoute>
              } />
              <Route path="/admin/credentials" element={
                <Navigate to="/admin/mentors" replace />
              } />
              <Route path="/admin/mentors" element={
                <ProtectedRoute><AdminRoute><MentorVerification /></AdminRoute></ProtectedRoute>
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
