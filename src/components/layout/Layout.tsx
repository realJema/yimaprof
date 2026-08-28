import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ResumeExamWatcher from '@/components/exam/ResumeExamWatcher';
import HelpChatBubble from '@/components/chat/HelpChatBubble';
import ForcePasswordChange from '@/components/auth/ForcePasswordChange';


interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const hideFooter = location.pathname.startsWith('/exam/');

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <ResumeExamWatcher />
        {children}
      </main>
      <ForcePasswordChange />
      <HelpChatBubble />

      {!hideFooter && <Footer className="mt-10" />}
    </div>
  );
}
