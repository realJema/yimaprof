import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Exams from "./pages/Exams";
import Exams2 from "./pages/Exams2";
import ExamSubjects from "./pages/ExamSubjects";
import ExamList from "./pages/ExamList";
import ExamViewer from "./pages/ExamViewer";
import Settings from "./pages/Settings";
import Subscriptions from "./pages/Subscriptions";
import Payment from "./pages/Payment";
import PaymentProcessing from "./pages/PaymentProcessing";
import Admin from "./pages/Admin";
import AdminExams from "./pages/AdminExams";
import ExamManager from "./pages/ExamManager";
import Affiliate from "./pages/Affiliate";
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
                <Layout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/exams" element={<Exams />} />
                    <Route path="/exams/:classId/subjects" element={<ExamSubjects />} />
                    <Route path="/exams/:classId/list" element={<ExamList />} />
                    <Route path="/exam/:examId" element={<ExamViewer />} />
                    <Route path="/exams2" element={<Exams2 />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/subscriptions" element={<Subscriptions />} />
                    <Route path="/affiliate" element={<Affiliate />} />
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