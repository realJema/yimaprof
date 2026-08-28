import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownText } from '@/components/ui/markdown-text';
import SeoHead from '@/components/SeoHead';
import { ArrowLeft, CheckCircle2, Clock, FileText, Lock } from 'lucide-react';

interface LessonDetailRow {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  file_url: string | null;
  chapter: string | null;
  estimated_minutes: number | null;
  is_free: boolean;
  classes: { display_name: string } | null;
  subjects: { name_fr: string | null; name_en: string | null } | null;
}

interface ExerciseRow {
  exam_id: string;
  exams: { id: string; title: string } | null;
}

export default function LessonDetail() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasActiveSubscription } = useSubscription();

  const [lesson, setLesson] = useState<LessonDetailRow | null>(null);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lessonId) return;
    (async () => {
      const [{ data: l }, { data: ex }] = await Promise.all([
        supabase
          .from('lessons')
          .select('id, title, summary, content, file_url, chapter, estimated_minutes, is_free, classes(display_name), subjects(name_fr, name_en)')
          .eq('id', lessonId)
          .maybeSingle(),
        supabase.from('lesson_exercises').select('exam_id, exams(id, title)').eq('lesson_id', lessonId).order('order_number'),
      ]);
      setLesson((l as unknown as LessonDetailRow) || null);
      const exRows = (ex as unknown as ExerciseRow[]) || [];
      setExercises(exRows);

      if (user) {
        const { data: p } = await supabase
          .from('lesson_progress')
          .select('progress_percent, status, time_spent_seconds')
          .eq('lesson_id', lessonId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (p) {
          setProgress(p.progress_percent);
          setTimeSpent(p.time_spent_seconds || 0);
          setCompleted(p.status === 'completed');
        }

        // Best score per linked exercise, so the student sees what is done.
        if (exRows.length) {
          const { data: evals } = await supabase
            .from('user_evaluations')
            .select('exam_id, total_score, total_possible, mcq_score, mcq_total')
            .eq('user_id', user.id)
            .in('exam_id', exRows.map((r) => r.exam_id));
          const best: Record<string, number> = {};
          (evals || []).forEach((e) => {
            const score = Number(e.total_score ?? e.mcq_score ?? 0);
            const possible = Number(e.total_possible ?? e.mcq_total ?? 0) || 20;
            const pct = Math.round((score / possible) * 100);
            best[e.exam_id] = Math.max(best[e.exam_id] ?? 0, pct);
          });
          setAttempts(best);
        }
      }
      setLoading(false);
    })();
  }, [lessonId, user]);

  // Reading a lesson counts as progress: mark it "in_progress" on arrival and
  // accumulate the time spent when the student leaves the page.
  useEffect(() => {
    if (!user || !lessonId || loading || !lesson) return;
    const startedAt = Date.now();

    if (!completed) {
      supabase.from('lesson_progress').upsert(
        {
          lesson_id: lessonId,
          user_id: user.id,
          status: 'in_progress',
          progress_percent: Math.max(progress, 25),
          last_viewed_at: new Date().toISOString(),
        },
        { onConflict: 'lesson_id,user_id' },
      ).then(() => setProgress((p) => Math.max(p, 25)));
    }

    return () => {
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      if (elapsed < 5) return;
      supabase.from('lesson_progress').upsert(
        {
          lesson_id: lessonId,
          user_id: user.id,
          status: completed ? 'completed' : 'in_progress',
          progress_percent: completed ? 100 : Math.max(progress, 25),
          time_spent_seconds: timeSpent + elapsed,
          last_viewed_at: new Date().toISOString(),
        },
        { onConflict: 'lesson_id,user_id' },
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, lessonId, loading, lesson?.id]);

  const markCompleted = async () => {
    if (!user || !lessonId) return;
    await supabase
      .from('lesson_progress')
      .upsert(
        { lesson_id: lessonId, user_id: user.id, status: 'completed', progress_percent: 100, last_viewed_at: new Date().toISOString() },
        { onConflict: 'lesson_id,user_id' },
      );
    setCompleted(true);
    setProgress(100);
  };


  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">{fr ? 'Leçon introuvable.' : 'Lesson not found.'}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/lessons')}>
          {fr ? 'Retour aux leçons' : 'Back to lessons'}
        </Button>
      </div>
    );
  }

  const locked = !lesson.is_free && !hasActiveSubscription;
  const subjectName = lesson.subjects?.name_fr || lesson.subjects?.name_en;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <SeoHead
        title={`${lesson.title} | Yimaprof`}
        description={lesson.summary || (fr ? 'Leçon Yimaprof' : 'Yimaprof lesson')}
        path={`/lessons/${lesson.id}`}
        type="article"
      />

      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/lessons')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        {fr ? 'Leçons' : 'Lessons'}
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{lesson.title}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {lesson.classes?.display_name && <Badge variant="outline">{lesson.classes.display_name}</Badge>}
          {subjectName && <Badge variant="outline">{subjectName}</Badge>}
          {lesson.chapter && <Badge variant="outline">{lesson.chapter}</Badge>}
          {lesson.estimated_minutes && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />{lesson.estimated_minutes} min
            </span>
          )}
        </div>
        {lesson.summary && <p className="text-muted-foreground mt-3">{lesson.summary}</p>}
      </div>

      {locked ? (
        <Card className="border-secondary/40">
          <CardContent className="py-10 text-center space-y-4">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-medium">{fr ? 'Cette leçon est réservée aux abonnés' : 'This lesson is for subscribers'}</p>
            <Button asChild><Link to="/subscriptions">{fr ? 'Voir les abonnements' : 'See plans'}</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {user && (
            <Card className="mb-6">
              <CardContent className="py-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm mb-2">{fr ? 'Ma progression' : 'My progress'}</p>
                  <Progress value={progress} />
                </div>
                <Button size="sm" variant={completed ? 'secondary' : 'default'} onClick={markCompleted} disabled={completed}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {completed ? (fr ? 'Terminée' : 'Completed') : fr ? 'Marquer comme lue' : 'Mark as read'}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="py-6 prose-sm max-w-none">
              <MarkdownText text={lesson.content} />
            </CardContent>
          </Card>

          {lesson.file_url && (
            <Button variant="outline" className="mt-4" asChild>
              <a href={lesson.file_url} target="_blank" rel="noreferrer">
                <FileText className="h-4 w-4 mr-2" />{fr ? 'Fiche PDF' : 'PDF handout'}
              </a>
            </Button>
          )}

          {exercises.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg">{fr ? 'Exercices d’application' : 'Practice exercises'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {exercises.map((ex) => (
                  <Link
                    key={ex.exam_id}
                    to={`/exam/${ex.exam_id}?mode=evaluation&lesson=${lesson.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm min-w-0 truncate">{ex.exams?.title}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {attempts[ex.exam_id] !== undefined && (
                        <Badge variant={attempts[ex.exam_id] >= 50 ? 'secondary' : 'outline'}>
                          {attempts[ex.exam_id]}%
                        </Badge>
                      )}
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

        </>
      )}
    </div>
  );
}