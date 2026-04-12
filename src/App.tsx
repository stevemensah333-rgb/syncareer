import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProfileProvider } from "./contexts/UserProfileContext";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { LoadingFallback } from "./components/LoadingFallback";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleRoute from "./components/auth/RoleRoute";
import AdminRoute from "./components/auth/AdminRoute";

// Lazy-loaded pages
const Landing = lazy(() => import("./pages/Landing"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const PublicPortfolio = lazy(() => import("./pages/PublicPortfolio"));
const Pricing = lazy(() => import("./pages/Pricing"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const Install = lazy(() => import("./pages/Install"));

// Student pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Assessment = lazy(() => import("./pages/Assessment"));
const Stocks = lazy(() => import("./pages/Stocks"));
const Learn = lazy(() => import("./pages/Learn"));
const Markets = lazy(() => import("./pages/Markets"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Performance = lazy(() => import("./pages/Performance"));
const Analysis = lazy(() => import("./pages/Analysis"));
const AICoach = lazy(() => import("./pages/AICoach"));
const InterviewSimulator = lazy(() => import("./pages/InterviewSimulator"));
const ApplicationTracker = lazy(() => import("./pages/ApplicationTracker"));
const CVBuilder = lazy(() => import("./pages/CVBuilder"));

// Admin pages
const FeedbackDashboard = lazy(() => import("./pages/admin/FeedbackDashboard"));
const UsersDashboard = lazy(() => import("./pages/admin/UsersDashboard"));

// Shared pages (accessible by all authenticated roles)
const Settings = lazy(() => import("./pages/Settings"));

// Employer pages
const MyCompany = lazy(() => import("./pages/employer/MyCompany"));
const TalentInsights = lazy(() => import("./pages/employer/TalentInsights"));
const PostJob = lazy(() => import("./pages/employer/PostJob"));
const TrainEmployees = lazy(() => import("./pages/employer/TrainEmployees"));
const HireWithAI = lazy(() => import("./pages/employer/HireWithAI"));
const ApplicantTracker = lazy(() => import("./pages/employer/ApplicantTracker"));

// Counsellor pages
const CounsellorDashboard = lazy(() => import("./pages/counsellor/CounsellorDashboard"));
const CounsellorAvailability = lazy(() => import("./pages/counsellor/CounsellorAvailability"));
const CounsellorSessions = lazy(() => import("./pages/counsellor/CounsellorSessions"));

const queryClient = new QueryClient();

const App = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <UserProfileProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Navigate to="/" replace />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                <Route path="/portfolio/:userId" element={<PublicPortfolio />} />
                <Route path="/terms" element={<TermsAndConditions />} />
                <Route path="/install" element={<Install />} />
                
                {/* Onboarding - any authenticated user */}
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                
                {/* Shared routes - all authenticated roles */}
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={['student', 'employer', 'career_counsellor']}>
                      <Settings />
                    </RoleRoute>
                  </ProtectedRoute>
                } />
                
                {/* Legacy redirect */}
                <Route path="/home" element={<Navigate to="/dashboard" replace />} />

                {/* ============ STUDENT-ONLY ROUTES ============ */}
                {/* Assessment is publicly accessible (guest mode supported) */}
                <Route path="/assessment" element={<Assessment />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute><RoleRoute allowedRoles={['student']}><Dashboard /></RoleRoute></ProtectedRoute>
                } />
                <Route path="/skills" element={
                  <ProtectedRoute><RoleRoute allowedRoles={['student']}><Stocks /></RoleRoute></ProtectedRoute>
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
                <Route path="/performance" element={
                  <ProtectedRoute><RoleRoute allowedRoles={['student']}><Performance /></RoleRoute></ProtectedRoute>
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
                
                {/* ============ EMPLOYER-ONLY ROUTES ============ */}
                <Route path="/my-company" element={
                  <ProtectedRoute><RoleRoute allowedRoles={['employer']}><MyCompany /></RoleRoute></ProtectedRoute>
                } />
                <Route path="/talent-insights" element={
                  <ProtectedRoute><RoleRoute allowedRoles={['employer']}><TalentInsights /></RoleRoute></ProtectedRoute>
                } />
                <Route path="/post-job" element={
                  <ProtectedRoute><RoleRoute allowedRoles={['employer']}><PostJob /></RoleRoute></ProtectedRoute>
                } />
                <Route path="/train" element={
                  <ProtectedRoute><RoleRoute allowedRoles={['employer']}><TrainEmployees /></RoleRoute></ProtectedRoute>
                } />
                <Route path="/hire-ai" element={
                  <ProtectedRoute><RoleRoute allowedRoles={['employer']}><HireWithAI /></RoleRoute></ProtectedRoute>
                } />
                <Route path="/applicants" element={
                  <ProtectedRoute><RoleRoute allowedRoles={['employer']}><ApplicantTracker /></RoleRoute></ProtectedRoute>
                } />
                
                {/* ============ COUNSELLOR-ONLY ROUTES ============ */}
                <Route path="/counsellor-dashboard" element={
                  <ProtectedRoute><RoleRoute allowedRoles={['career_counsellor']}><CounsellorDashboard /></RoleRoute></ProtectedRoute>
                } />
                <Route path="/counsellor-availability" element={
                  <ProtectedRoute><RoleRoute allowedRoles={['career_counsellor']}><CounsellorAvailability /></RoleRoute></ProtectedRoute>
                } />
                <Route path="/counsellor-sessions" element={
                  <ProtectedRoute><RoleRoute allowedRoles={['career_counsellor']}><CounsellorSessions /></RoleRoute></ProtectedRoute>
                } />

                {/* ============ ADMIN ROUTES ============ */}
                <Route path="/admin/feedback" element={
                  <ProtectedRoute><AdminRoute><FeedbackDashboard /></AdminRoute></ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute><AdminRoute><UsersDashboard /></AdminRoute></ProtectedRoute>
                } />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </UserProfileProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

export default App;
