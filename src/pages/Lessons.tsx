import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { browseQueryOptions, browseReadSignal } from '@/lib/browseQuery';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import SeoHead from '@/components/SeoHead';
import AuthInvitation from '@/components/auth/AuthInvitation';
import ViewOffersButton from '@/components/layout/ViewOffersButton';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, Clock, FileText, Lock, Search, Sparkles } from 'lucide-react';

interface LessonRow {
  id: string;
  title: string;
  summary: string | null;
  chapter: string | null;
  language: string;
  estimated_minutes: number | null;
  is_free: boolean;
  file_url: string | null;
  class_id: string | null;
  subject_id: string | null;
  series_id: string | null;
  series_ids?: string[];
  series: { code: string } | null;
  classes: { display_name: string } | null;
  subjects: { name_fr: string | null; name_en: string | null } | null;
}


export default function Lessons() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasActiveSubscription, loading: subscriptionLoading } = useSubscription();
  const { data: allSeries = [] } = useQuery({
    queryKey: ['lesson-browse-series'],
    ...browseQueryOptions,
    queryFn: async () => {
      const { data, error } = await supabase.from('series').select('id, code').order('order_number').abortSignal(browseReadSignal());
      if (error) throw error;
      return data || [];
    },
  });
  const { data: lessons = [], isLoading: loading, isError, refetch, isFetching } = useQuery({
    queryKey: ['lesson-catalogue'],
    ...browseQueryOptions,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, summary, chapter, language, estimated_minutes, is_free, file_url, class_id, subject_id, series_id, series_ids, series(code), classes(display_name), subjects(name_fr, name_en)')
        .eq('is_published', true)
        .order('order_number')
        .abortSignal(browseReadSignal());
      if (error) throw error;
      return (data as unknown as LessonRow[]) || [];
    },
  });
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [lockOpen, setLockOpen] = useState(false);

  const classes = useMemo(
    () => Array.from(new Set(lessons.map((l) => l.classes?.display_name).filter(Boolean))) as string[],
    [lessons],
  );
  const subjects = useMemo(
    () => Array.from(new Set(lessons.map((l) => (fr ? l.subjects?.name_fr : l.subjects?.name_en) || l.subjects?.name_fr || l.subjects?.name_en).filter(Boolean))) as string[],
    [lessons, fr],
  );

  const seriesCodes = useMemo(
    () => allSeries.filter((s) => lessons.some((l) => (l.series_ids?.length ? l.series_ids : l.series_id ? [l.series_id] : []).includes(s.id))).map((s) => s.code),
    [lessons, allSeries],
  );

  const filtered = useMemo(() => lessons.filter((l) => {
    if (seriesFilter !== 'all' && !(l.series_ids?.length ? l.series_ids : l.series_id ? [l.series_id] : []).some((id) => allSeries.find((s) => s.id === id)?.code === seriesFilter)) return false;
    const subjectName = (fr ? l.subjects?.name_fr : l.subjects?.name_en) || l.subjects?.name_fr || l.subjects?.name_en || '';
    if (classFilter !== 'all' && l.classes?.display_name !== classFilter) return false;
    if (subjectFilter !== 'all' && subjectName !== subjectFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        (l.summary || '').toLowerCase().includes(q) ||
        (l.chapter || '').toLowerCase().includes(q)
      );
    }
    return true;
  }), [lessons, seriesFilter, allSeries, fr, classFilter, subjectFilter, search]);

  // Student navigation: Subject -> Chapter -> Lesson (chapters come from lessons.chapter).
  const grouped = useMemo(() => {
    const bySubject = new Map<string, Map<string, LessonRow[]>>();
    filtered.forEach((l) => {
      const subject = (fr ? l.subjects?.name_fr : l.subjects?.name_en) || l.subjects?.name_fr || l.subjects?.name_en || (fr ? 'Autres' : 'Others');
      const chapter = l.chapter || (fr ? 'Général' : 'General');
      if (!bySubject.has(subject)) bySubject.set(subject, new Map());
      const chapters = bySubject.get(subject);
      if (!chapters) return;
      if (!chapters.has(chapter)) chapters.set(chapter, []);
      chapters.get(chapter)?.push(l);
    });
    return Array.from(bySubject.entries()).map(([subject, chapters]) => [
      subject,
      Array.from(chapters.entries()),
    ] as [string, [string, LessonRow[]][]]);
  }, [filtered, fr]);

  const open = (lesson: LessonRow) => {
    if (lesson.is_free || hasActiveSubscription) navigate(`/lessons/${lesson.id}`);
    else setLockOpen(true);
  };


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SeoHead
        title={fr ? 'Leçons et cours en ligne | Yimaprof' : 'Online lessons and courses | Yimaprof'}
        description={
          fr
            ? 'Bibliothèque de leçons claires par classe et par matière, avec exercices d’application liés aux épreuves.'
            : 'A library of clear lessons by class and subject, with practice papers linked to each lesson.'
        }
        path="/lessons"
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-secondary" />
          {fr ? 'Leçons' : 'Lessons'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {fr
            ? 'Des cours structurés par classe et par matière, avec des exercices d’application.'
            : 'Structured courses by class and subject, with linked practice exercises.'}
        </p>
      </div>

      <ViewOffersButton />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={fr ? 'Rechercher une leçon…' : 'Search a lesson…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger><SelectValue placeholder={fr ? 'Classe' : 'Class'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{fr ? 'Toutes les classes' : 'All classes'}</SelectItem>
            {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger><SelectValue placeholder={fr ? 'Matière' : 'Subject'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{fr ? 'Toutes les matières' : 'All subjects'}</SelectItem>
            {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={seriesFilter} onValueChange={setSeriesFilter}>
          <SelectTrigger><SelectValue placeholder={fr ? 'Série / Filière' : 'Series / Track'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{fr ? 'Toutes les séries' : 'All series'}</SelectItem>
            {seriesCodes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading || subscriptionLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : isError && lessons.length === 0 ? (
        <div role="alert" className="space-y-3 py-8 text-center">
          <p className="text-muted-foreground">{fr ? 'Les leçons ne sont pas disponibles pour le moment. Veuillez réessayer.' : 'Lessons are temporarily unavailable. Please try again.'}</p>
          <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>{fr ? 'Réessayer' : 'Try again'}</Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">{fr ? 'Aucune leçon trouvée.' : 'No lesson found.'}</p>
      ) : (
        <div className="space-y-10">
          {grouped.map(([subject, chapters]) => (
            <section key={subject}>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-secondary" />{subject}
              </h2>
              <div className="space-y-6">
                {chapters.map(([chapter, items]) => (
                  <div key={chapter}>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                      {chapter}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {items.map((lesson) => {
                        const locked = !lesson.is_free && !hasActiveSubscription;
                        return (
                          <Card
                            key={lesson.id}
                            className="flex h-full flex-col border-t-4 border-t-primary transition-shadow hover:shadow-soft"
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-base leading-snug">{lesson.title}</CardTitle>
                                {locked ? (
                                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                                ) : lesson.is_free ? (
                                  <Badge variant="secondary" className="shrink-0">
                                    <Sparkles className="h-3 w-3 mr-1" />{fr ? 'Gratuit' : 'Free'}
                                  </Badge>
                                ) : null}
                              </div>
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col gap-3">
                              <p className="text-sm text-muted-foreground line-clamp-2">{lesson.summary}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                {lesson.classes?.display_name && <Badge variant="outline">{lesson.classes.display_name}</Badge>}
                                {(lesson.series_ids?.length ? lesson.series_ids : lesson.series_id ? [lesson.series_id] : []).map((id) => <Badge key={id} variant="outline">{allSeries.find((s) => s.id === id)?.code}</Badge>)}
                                {lesson.file_url && (
                                  <Badge variant="outline" className="gap-1">
                                    <FileText className="h-3 w-3" />{fr ? 'Document' : 'Document'}
                                  </Badge>
                                )}
                                {lesson.estimated_minutes && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="h-3 w-3" />{lesson.estimated_minutes} min
                                  </span>
                                )}
                              </div>
                              <Button variant={locked ? 'outline' : 'default'} className="mt-auto w-full" onClick={() => open(lesson)}>{locked ? (fr ? 'Découvrir la leçon' : 'Discover lesson') : (fr ? 'Ouvrir la leçon' : 'Open lesson')}</Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}


      <Dialog open={lockOpen} onOpenChange={setLockOpen}>
        <DialogContent>
          {!user ? <AuthInvitation /> : <>
          <DialogHeader>
            <DialogTitle>{fr ? 'Leçon réservée aux abonnés' : 'Lesson reserved for subscribers'}</DialogTitle>
            <DialogDescription>
              {fr
                ? 'Abonnez-vous pour accéder à toutes les leçons et à leurs exercices d’application.'
                : 'Subscribe to unlock every lesson and its practice exercises.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockOpen(false)}>{fr ? 'Fermer' : 'Close'}</Button>
            <Button asChild><Link to="/subscriptions">{fr ? 'Voir les abonnements' : 'See plans'}</Link></Button>
          </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}