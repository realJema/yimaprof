import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import SeoHead from '@/components/SeoHead';
import { BarChart3, BookOpen, Clock, Target, Trophy, Dumbbell, Lightbulb, ArrowRight } from 'lucide-react';

interface LessonProgressRow {
  lesson_id: string;
  status: string;
  progress_percent: number;
  time_spent_seconds: number;
  last_viewed_at: string;
  lessons: { title: string; chapter: string | null; subjects: { name_fr: string | null; name_en: string | null } | null } | null;
}

interface EvalRow {
  exam_id: string;
  total_score: number | null;
  total_possible: number | null;
  mcq_score: number | null;
  mcq_total: number | null;
  created_at: string;
  exams: { title: string; subjects: { name_fr: string | null; name_en: string | null } | null } | null;
}

export default function StudentProgress() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<LessonProgressRow[]>([]);
  const [evals, setEvals] = useState<EvalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exResults, setExResults] = useState<{ lesson_id: string; level: string; percent: number; created_at: string }[]>([]);
  const [chResults, setChResults] = useState<{ score_scaled: number | null; graded_out_of: number }[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    (async () => {
      const [{ data: lp }, { data: ev }, { data: lx }, { data: ca }] = await Promise.all([
        supabase
          .from('lesson_progress')
          .select('lesson_id, status, progress_percent, time_spent_seconds, last_viewed_at, lessons(title, chapter, subjects(name_fr, name_en))')
          .eq('user_id', user.id)
          .order('last_viewed_at', { ascending: false }),
        supabase
          .from('user_evaluations')
          .select('exam_id, total_score, total_possible, mcq_score, mcq_total, created_at, exams(title, subjects(name_fr, name_en))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('lesson_exercise_results' as never).select('lesson_id, level, percent, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('challenge_attempts').select('score_scaled, graded_out_of').eq('user_id', user.id),
      ]);
      setExResults((lx as unknown as typeof exResults) || []);
      setChResults((ca as unknown as typeof chResults) || []);
      setLessons((lp as unknown as LessonProgressRow[]) || []);
      setEvals((ev as unknown as EvalRow[]) || []);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const pct = (e: EvalRow) => {
    const score = Number(e.total_score ?? e.mcq_score ?? 0);
    const possible = Number(e.total_possible ?? e.mcq_total ?? 0) || 20;
    return Math.round((score / possible) * 100);
  };

  const stats = useMemo(() => {
    const completed = lessons.filter((l) => l.status === 'completed').length;
    const minutes = Math.round(lessons.reduce((s, l) => s + (l.time_spent_seconds || 0), 0) / 60);
    const all = [
      ...evals.map(pct),
      ...exResults.map((r) => r.percent),
      ...chResults.map((c) => Math.round(((c.score_scaled ?? 0) / (c.graded_out_of || 20)) * 100)),
    ];
    const avg = all.length ? Math.round(all.reduce((s, v) => s + v, 0) / all.length) : 0;
    const byLevel = { facile: 0, intermediaire: 0, difficile: 0 } as Record<string, number>;
    exResults.forEach((r) => { byLevel[r.level] = (byLevel[r.level] || 0) + 1; });
    return { completed, minutes, avg, attempts: evals.length, exercises: exResults.length, challenges: chResults.length, byLevel, any: all.length > 0 };
  }, [lessons, evals, exResults, chResults]);

  const reco = useMemo(() => {
    const weak = bySubjectWeak(evals, fr, pct);
    if (!stats.any) return {
      title: fr ? 'Commencez votre parcours' : 'Start your journey',
      tips: [fr ? 'Fixez-vous 20 minutes d’étude par jour.' : 'Set yourself 20 minutes of study a day.'],
      actions: [{ to: '/lessons', label: fr ? 'Ouvrir une leçon' : 'Open a lesson' }, { to: '/exams2', label: fr ? 'Parcourir les épreuves' : 'Browse papers' }],
      weak,
    };
    if (stats.avg < 50) return {
      title: fr ? 'Consolidez les bases' : 'Strengthen the basics',
      tips: [
        fr ? 'Relisez le cours avant chaque exercice et notez les définitions clés.' : 'Re-read the lesson before each exercise and note key definitions.',
        fr ? 'Lisez attentivement le corrigé de chaque erreur.' : 'Read the correction of every mistake carefully.',
      ],
      actions: [{ to: '/lessons', label: fr ? 'Refaire les exercices de niveau Facile' : 'Redo the Easy-level exercises' }, { to: '/forum', label: fr ? 'Poser vos questions sur le forum' : 'Ask your questions on the forum' }],
      weak,
    };
    if (stats.avg < 70) return {
      title: fr ? 'Vous progressez, continuez' : 'You are progressing, keep going',
      tips: [
        fr ? 'Passez au niveau Intermédiaire dès que vous dépassez 70 % en Facile.' : 'Move to Intermediate once you score above 70% on Easy.',
        fr ? 'Travaillez en priorité vos matières les plus faibles.' : 'Focus first on your weakest subjects.',
      ],
      actions: [{ to: '/lessons', label: fr ? 'Faire les exercices Intermédiaires' : 'Do Intermediate exercises' }, { to: '/exams2', label: fr ? 'Faire une auto-évaluation chronométrée' : 'Take a timed self-assessment' }],
      weak,
    };
    if (stats.avg < 85) return {
      title: fr ? 'Bon niveau, visez l’excellence' : 'Good level, aim for excellence',
      tips: [
        fr ? 'Entraînez-vous en conditions d’examen, sans consulter le cours.' : 'Practise in exam conditions, without the lesson.',
        fr ? 'Analysez le temps passé par question.' : 'Check the time spent per question.',
      ],
      actions: [{ to: '/lessons', label: fr ? 'Attaquer le niveau Difficile' : 'Tackle the Hard level' }, { to: '/challenges', label: fr ? 'Participer à un challenge' : 'Join a challenge' }],
      weak,
    };
    return {
      title: fr ? 'Excellent travail' : 'Excellent work',
      tips: [
        fr ? 'Maintenez le rythme avec des épreuves d’années précédentes.' : 'Keep the pace with past papers.',
        fr ? 'Expliquez les notions à vos camarades pour les ancrer.' : 'Explain concepts to classmates to anchor them.',
      ],
      actions: [{ to: '/challenges', label: fr ? 'Relever un challenge' : 'Take on a challenge' }, { to: '/forum', label: fr ? 'Aider sur le forum' : 'Help on the forum' }],
      weak,
    };
  }, [stats, evals, fr]);

  const bySubject = useMemo(() => {
    const map = new Map<string, number[]>();
    evals.forEach((e) => {
      const subject = e.exams?.subjects?.name_fr || e.exams?.subjects?.name_en || (fr ? 'Autres' : 'Others');
      map.set(subject, [...(map.get(subject) || []), pct(e)]);
    });
    return Array.from(map.entries())
      .map(([subject, list]) => ({ subject, avg: Math.round(list.reduce((s, v) => s + v, 0) / list.length), count: list.length }))
      .sort((a, b) => b.avg - a.avg);
  }, [evals, fr]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <SeoHead
        title={fr ? 'Ma progression | Yimaprof' : 'My progress | Yimaprof'}
        description={fr ? 'Suivez votre progression dans les leçons et vos résultats aux épreuves.' : 'Track your lesson progress and exam results.'}
        path="/progress"
      />

      <h1 className="text-3xl font-bold flex items-center gap-2 mb-6">
        <BarChart3 className="h-7 w-7 text-secondary" />
        {fr ? 'Ma progression' : 'My progress'}
      </h1>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-8">
        {[
          { label: fr ? 'Leçons terminées' : 'Lessons completed', value: `${stats.completed}/${lessons.length}`, icon: BookOpen },
          { label: fr ? 'Temps d’étude' : 'Study time', value: `${stats.minutes} min`, icon: Clock },
          { label: fr ? 'Exercices effectués' : 'Exercises done', value: `${stats.exercises}`, icon: Dumbbell },
          { label: fr ? 'Épreuves faites' : 'Exams taken', value: `${stats.attempts}`, icon: Target },
          { label: 'Challenges', value: `${stats.challenges}`, icon: Trophy },
          { label: fr ? 'Moyenne générale' : 'Overall average', value: `${stats.avg}%`, icon: BarChart3 },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <s.icon className="h-4 w-4 text-secondary mb-2" />
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6 border-secondary/30">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Lightbulb className="h-5 w-5 text-secondary" />{reco.title}</CardTitle></CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">{fr ? 'Conseils' : 'Tips'}</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {reco.tips.map((t) => <li key={t}>• {t}</li>)}
              {reco.weak.length > 0 && <li>• {fr ? 'À renforcer : ' : 'To strengthen: '}<span className="font-medium text-foreground">{reco.weak.join(', ')}</span></li>}
            </ul>
            {stats.exercises > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {fr ? 'Exercices par niveau' : 'Exercises by level'} — {fr ? 'Facile' : 'Easy'} : {stats.byLevel.facile} · {fr ? 'Intermédiaire' : 'Intermediate'} : {stats.byLevel.intermediaire} · {fr ? 'Difficile' : 'Hard'} : {stats.byLevel.difficile}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{fr ? 'Actions conseillées' : 'Suggested actions'}</p>
            {reco.actions.map((a) => (
              <Button key={a.label} asChild variant="outline" className="w-full justify-between">
                <Link to={a.to}>{a.label}<ArrowRight className="h-4 w-4" /></Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">{fr ? 'Performance par matière' : 'Performance by subject'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {bySubject.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {fr ? 'Passez une épreuve pour voir vos résultats ici.' : 'Take an exam to see your results here.'}
              </p>
            )}
            {bySubject.map((s) => (
              <div key={s.subject}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{s.subject} <span className="text-muted-foreground">({s.count})</span></span>
                  <span className="font-semibold">{s.avg}%</span>
                </div>
                <ProgressBar value={s.avg} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">{fr ? 'Leçons suivies' : 'Lessons followed'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lessons.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{fr ? 'Aucune leçon commencée.' : 'No lesson started yet.'}</p>
                <Button asChild size="sm"><Link to="/lessons">{fr ? 'Voir les leçons' : 'Browse lessons'}</Link></Button>
              </div>
            )}
            {lessons.slice(0, 8).map((l) => (
              <Link key={l.lesson_id} to={`/lessons/${l.lesson_id}`} className="block rounded-lg border border-border p-3 hover:bg-muted/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm truncate">{l.lessons?.title}</span>
                  <Badge variant={l.status === 'completed' ? 'secondary' : 'outline'}>{l.progress_percent}%</Badge>
                </div>
                <ProgressBar className="mt-2" value={l.progress_percent} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {evals.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-lg">{fr ? 'Derniers résultats' : 'Latest results'}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {evals.slice(0, 10).map((e, i) => (
              <div key={`${e.exam_id}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <span className="text-sm min-w-0 truncate">{e.exams?.title}</span>
                <Badge variant={pct(e) >= 50 ? 'secondary' : 'outline'}>{pct(e)}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function bySubjectWeak(evals: EvalRow[], fr: boolean, pct: (e: EvalRow) => number): string[] {
  const map = new Map<string, number[]>();
  evals.forEach((e) => {
    const subject = (fr ? e.exams?.subjects?.name_fr : e.exams?.subjects?.name_en) || e.exams?.subjects?.name_fr || e.exams?.subjects?.name_en;
    if (subject) map.set(subject, [...(map.get(subject) || []), pct(e)]);
  });
  return Array.from(map.entries())
    .map(([s, l]) => ({ s, avg: l.reduce((a, b) => a + b, 0) / l.length }))
    .filter((x) => x.avg < 50)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 3)
    .map((x) => x.s);
}
