import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RecoveryRedirect from "@/components/auth/RecoveryRedirect";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Exams2 from "./pages/Exams2";
import ExamViewer from "./pages/ExamViewer";
import Settings from "./pages/Settings";
import Subscriptions from "./pages/Subscriptions";
import Payment from "./pages/Payment";
import PaymentProcessing from "./pages/PaymentProcessing";
import Admin from "./pages/Admin";
import AdminExams from "./pages/AdminExams";
import ExamManager from "./pages/ExamManager";
import Affiliate from "./pages/Affiliate";
import CommercialDashboard from "./pages/CommercialDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import Notifications from "./pages/Notifications";
import TestNotifications from "./pages/TestNotifications";
import WriteToUs from "./pages/WriteToUs";
import Forum from "./pages/Forum";
import ForumTopic from "./pages/ForumTopic";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import VerifyEmail from "./pages/VerifyEmail";
import Lessons from "./pages/Lessons";
import LessonDetail from "./pages/LessonDetail";
import Schools from "./pages/Schools";
import SchoolSpace from "./pages/SchoolSpace";
import StudentProgress from "./pages/Progress";


const queryClient = new QueryClient();

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