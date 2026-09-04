import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import SeoHead from '@/components/SeoHead';
import LessonManagement from '@/components/admin/LessonManagement';
import { ArrowLeft, BookOpen, Shield } from 'lucide-react';

/** Admin/editor workspace for lessons built on externally hosted Word documents. */
export default function AdminLessons() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setHasAccess(false);
      setChecking(false);
      return;
    }
    (async () => {
      try {
        const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id });
        if (isAdmin === true) {
          setHasAccess(true);
          return;
        }
        const { data: isEditor } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'editor' });
        setHasAccess(isEditor === true);
      } catch {
        setHasAccess(false);
      } finally {
        setChecking(false);
      }
    })();
  }, [user, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <Shield className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-medium">{fr ? 'Accès réservé aux administrateurs.' : 'Administrators only.'}</p>
            <Button asChild variant="outline">
              <Link to="/">{fr ? 'Retour à l’accueil' : 'Back home'}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SeoHead
        title={fr ? 'Gestion des leçons | Yimaprof' : 'Lesson management | Yimaprof'}
        description={fr ? 'Espace administrateur de gestion des leçons.' : 'Administrator lesson management area.'}
        path="/admin/lessons"
        noindex
      />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-secondary" />
            {fr ? 'Gestion des leçons' : 'Lesson management'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {fr
              ? 'Créez une leçon en collant le lien d’un document Word hébergé (Google Drive, OneDrive, Dropbox).'
              : 'Create a lesson by pasting the link of a hosted Word document (Google Drive, OneDrive, Dropbox).'}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {fr ? 'Tableau de bord' : 'Dashboard'}
          </Link>
        </Button>
      </div>

      <LessonManagement />
    </div>
  );
}
