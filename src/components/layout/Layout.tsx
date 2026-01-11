import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ResumeExamWatcher from '@/components/exam/ResumeExamWatcher';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const hideFooter = location.pathname.startsWith('/exam/');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <ResumeExamWatcher />
        {children}
      </main>
      {!hideFooter && <Footer className="mt-10" />}
    </div>
  );
}
