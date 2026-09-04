import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RecoveryRedirect from "@/components/auth/RecoveryRedirect";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";

const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Exams2 = lazy(() => import("./pages/Exams2"));
const ExamViewer = lazy(() => import("./pages/ExamViewer"));
const Settings = lazy(() => import("./pages/Settings"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const Payment = lazy(() => import("./pages/Payment"));
const PaymentProcessing = lazy(() => import("./pages/PaymentProcessing"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminExams = lazy(() => import("./pages/AdminExams"));
const AdminLessons = lazy(() => import("./pages/AdminLessons"));
const ExamManager = lazy(() => import("./pages/ExamManager"));
const Affiliate = lazy(() => import("./pages/Affiliate"));
const CommercialDashboard = lazy(() => import("./pages/CommercialDashboard"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const Notifications = lazy(() => import("./pages/Notifications"));
const TestNotifications = lazy(() => import("./pages/TestNotifications"));
const WriteToUs = lazy(() => import("./pages/WriteToUs"));
const Forum = lazy(() => import("./pages/Forum"));
const ForumTopic = lazy(() => import("./pages/ForumTopic"));
const NotFound = lazy(() => import("./pages/NotFound"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Lessons = lazy(() => import("./pages/Lessons"));
const LessonDetail = lazy(() => import("./pages/LessonDetail"));
const Schools = lazy(() => import("./pages/Schools"));
const SchoolSpace = lazy(() => import("./pages/SchoolSpace"));
const StudentProgress = lazy(() => import("./pages/Progress"));
const Challenges = lazy(() => import("./pages/Challenges"));
const ChallengeDetail = lazy(() => import("./pages/ChallengeDetail"));


const queryClient = new QueryClient();

const RouteLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Chargement">
    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
  </div>
);

const App = () => {
  // Disable right-click globally
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <RecoveryRedirect />
                <Layout>
                  <Suspense fallback={<RouteLoader />}>
                    <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    {/* Redirect old /exams routes to browse page */}
                    <Route path="/exams" element={<Navigate to="/exams2" replace />} />
                    <Route path="/exams/:classId/subjects" element={<Navigate to="/exams2" replace />} />
                    <Route path="/exams/:classId/list" element={<Navigate to="/exams2" replace />} />
                    <Route path="/exam/:examId" element={<ExamViewer />} />
                    <Route path="/exams2" element={<Exams2 />} />
                    <Route path="/lessons" element={<Lessons />} />
                    <Route path="/lessons/:lessonId" element={<LessonDetail />} />
                    <Route path="/progress" element={<StudentProgress />} />
                    <Route path="/challenges" element={<Challenges />} />
                    <Route path="/challenges/:challengeId" element={<ChallengeDetail />} />

                    <Route path="/schools" element={<Schools />} />
                    <Route path="/school" element={<SchoolSpace />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/subscriptions" element={<Subscriptions />} />
                    <Route path="/affiliate" element={<Affiliate />} />
                    <Route path="/commercial" element={<CommercialDashboard />} />
                    <Route path="/parent" element={<ParentDashboard />} />
                    <Route path="/payment" element={<Payment />} />
                    <Route path="/payment-processing" element={<PaymentProcessing />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/admin/exams" element={<AdminExams />} />
                    <Route path="/admin/lessons" element={<AdminLessons />} />
                    <Route path="/admin/exam/new" element={<ExamManager />} />
                    <Route path="/admin/exam/edit/:examId" element={<ExamManager />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/test-notifications" element={<TestNotifications />} />
                    <Route path="/write-to-us" element={<WriteToUs />} />
                    <Route path="/forum" element={<Forum />} />
                    <Route path="/forum/:topicId" element={<ForumTopic />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </Layout>
              </BrowserRouter>
            </TooltipProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;