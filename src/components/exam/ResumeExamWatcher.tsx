import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  getWasOffline,
  setWasOffline,
  getLastActiveExamRoute,
  loadPendingSubmissions,
  replacePendingSubmissions,
} from '@/lib/evaluationSession';

export default function ResumeExamWatcher() {
  const location = useLocation();
  const navigate = useNavigate();

  // Track offline/online to know when to auto-resume.
  useEffect(() => {
    const onOffline = () => setWasOffline(true);
    const onOnline = () => setWasOffline(false);

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  // Auto redirect to last active exam when coming back online.
  useEffect(() => {
    const onOnline = () => {
      const wasOffline = getWasOffline();
      const lastRoute = getLastActiveExamRoute();
      if (!wasOffline) return;
      if (!lastRoute) return;

      // Avoid redirect loops
      if (location.pathname.startsWith('/exam/')) return;

      navigate(lastRoute);
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [location.pathname, navigate]);

  // Best-effort flush of pending evaluation submissions.
  useEffect(() => {
    const flush = async () => {
      const pending = loadPendingSubmissions();
      if (!pending.length) return;
      if (!navigator.onLine) return;

      const remaining: typeof pending = [];

      for (const item of pending) {
        const { error } = await supabase.from('user_evaluations').insert(item.payload);
        if (error) {
          remaining.push(item);
        }
      }

      replacePendingSubmissions(remaining);
    };

    flush();
  }, [location.key]);

  return null;
}
