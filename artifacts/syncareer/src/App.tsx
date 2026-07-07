import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { UserProfileProvider, useUserProfile } from "./contexts/UserProfileContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { prefetchLandingRoutes, prefetchStudentRoutes, prefetchCounsellorRoutes } from "@/lib/routePrefetch";

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
const PublicPortfolio = lazy(() => import("./pages/PublicPortfolio"));
const PublicProjectDetail = lazy(() => import("./pages/PublicProjectDetail"));
const Pricing = lazy(() => import("./pages/Pricing"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const SignedOut = lazy(() => import("./pages/SignedOut"));

// Student pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Assessment = lazy(() => import("./pages/Assessment"));

const Markets = lazy(() => import("./pages/Markets"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Analysis = lazy(() => import("./pages/Analysis"));
const AICoach = lazy(() => import("./pages/AICoach"));
const InterviewSimulator = lazy(() => import("./pages/InterviewSimulator"));
const ApplicationTracker = lazy(() => import("./pages/ApplicationTracker"));
const CVBuilder = lazy(() => import("./pages/CVBuilder"));
const Build = lazy(() => import("./pages/Build"));
const Practice = lazy(() => import("./pages/Practice"));
const Apply = lazy(() => import("./pages/Apply"));

// Admin pages
const FeedbackDashboard = lazy(() => import("./pages/admin/FeedbackDashboard"));
const UsersDashboard = lazy(() => import("./pages/admin/UsersDashboard"));
const CredentialReview = lazy(() => import("./pages/admin/CredentialReview"));

// Shared pages
const Settings = lazy(() => import("./pages/Settings"));

// Counsellor pages
const CounsellorDashboard = lazy(() => import("./pages/counsellor/CounsellorDashboard"));
const CounsellorAvailability = lazy(() => import("./pages/counsellor/CounsellorAvailability"));
const CounsellorSessions = lazy(() => import("./pages/counsellor/CounsellorSessions"));
const CounsellorClients = lazy(() => import("./pages/counsellor/CounsellorClients"));
const CredentialUpload = lazy(() => import("./pages/counsellor/CredentialUpload"));

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
        eyebrow="No worries"
        title="Reset your password"
        italicWord="your password"
        subtitle="Tell us the email on your account and we'll send you a reset link."
      >
        <ForgotPasswordForm />
      </AuthShell>
    );
  }
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to keep going"
      italicWord="keep going"
      subtitle="Pick up where you left off — your assessments, CV, and saved roles are waiting."
    >
      <SignInForm />
    </AuthShell>
  );
}

function SignUpPage() {
  return (
    <AuthShell
      eyebrow="For African graduates"
      title="Start your career story"
      italicWord="career story"
      subtitle="Take the free assessment, build an ATS-ready CV, and practise interviews — all in one place."
    >
      <SignUpForm />
    </AuthShell>
  );
}

function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Almost there"
      title="Choose a new password"
      italicWord="new password"
      subtitle="Pick something memorable — you'll use it next time you sign in to Syncareer."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}

const AppContent = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      
      <UserProfileProvider>
        <NotificationProvider>
          <TooltipProvider>
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
              <Route path="/portfolio/:userId" element={<PublicPortfolio />} />
              <Route path="/portfolio/:userId/p/:projectId" element={<PublicProjectDetail />} />
              <Route path="/u/:slug" element={<PublicPortfolio />} />
              <Route path="/u/:slug/p/:projectSlug" element={<PublicProjectDetail />} />
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
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
              <Route path="/build" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><Build /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/practice" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><Practice /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/apply" element={
                <ProtectedRoute><RoleRoute allowedRoles={['student']}><Apply /></RoleRoute></ProtectedRoute>
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
              <Route path="/counsellor-clients" element={
                <ProtectedRoute><RoleRoute allowedRoles={['career_counsellor']}><CounsellorClients /></RoleRoute></ProtectedRoute>
              } />
              <Route path="/counsellor/complete-credentials" element={
                <ProtectedRoute><RoleRoute allowedRoles={['career_counsellor']}><CredentialUpload /></RoleRoute></ProtectedRoute>
              } />

              {/* ADMIN ROUTES */}
              <Route path="/admin/feedback" element={
                <ProtectedRoute><AdminRoute><FeedbackDashboard /></AdminRoute></ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute><AdminRoute><UsersDashboard /></AdminRoute></ProtectedRoute>
              } />
              <Route path="/admin/credentials" element={
                <ProtectedRoute><AdminRoute><CredentialReview /></AdminRoute></ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </TooltipProvider>
        </NotificationProvider>
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
