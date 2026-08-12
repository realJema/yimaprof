import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Route, Search } from 'lucide-react';

interface ActivityRow {
  student_id: string;
  student_name: string;
  lesson_id: string;
  lesson_title: string;
  subject_name: string | null;
  status: string;
  progress_percent: number;
  time_spent_seconds: number;
  last_viewed_at: string;
}

interface ResultRow {
  student_id: string;
  exam_title: string;
  subject_name: string | null;
  percent: number;
  completed_at: string;
}

export default function SchoolJourney({ establishmentId }: { establishmentId: string }) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const [act, res] = await Promise.all([
        supabase.rpc('establishment_student_activity', { p_establishment_id: establishmentId }),
        supabase.rpc('establishment_results', { p_establishment_id: establishmentId }),
      ]);
      setActivity((act.data as unknown as ActivityRow[]) || []);
      setResults((res.data as unknown as ResultRow[]) || []);
      setLoading(false);
    })();
  }, [establishmentId]);

  const students = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    activity.forEach((a) => map.set(a.student_id, { id: a.student_id, name: a.student_name }));
    return Array.from(map.values())
      .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activity, search]);

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Route className="h-5 w-5" />{fr ? 'Parcours des élèves' : 'Student journey'}
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={fr ? 'Rechercher un élève…' : 'Search a student…'} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {students.map((s) => {
            const lessons = activity.filter((a) => a.student_id === s.id);
            const evals = results.filter((r) => r.student_id === s.id);
            const done = lessons.filter((l) => l.status === 'completed').length;
            const avg = evals.length ? Math.round(evals.reduce((sum, e) => sum + Number(e.percent), 0) / evals.length) : 0;
            const minutes = Math.round(lessons.reduce((sum, l) => sum + l.time_spent_seconds, 0) / 60);
            return (
              <AccordionItem key={s.id} value={s.id}>
                <AccordionTrigger>
                  <div className="flex flex-1 flex-wrap items-center justify-between gap-2 pr-2 text-left">
                    <span className="font-medium">{s.name}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{done}/{lessons.length} {fr ? 'leçons' : 'lessons'}</Badge>
                      <Badge variant="outline">{evals.length} {fr ? 'évaluations' : 'evaluations'}</Badge>
                      <Badge variant="secondary">{avg}%</Badge>
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">{fr ? 'Temps de lecture cumulé' : 'Total reading time'}: {minutes} min</p>
                  <div>
                    <p className="text-sm font-medium mb-2">{fr ? 'Leçons' : 'Lessons'}</p>
                    <div className="space-y-2">
                      {lessons.map((l) => (
                        <div key={l.lesson_id} className="rounded-md bg-muted/40 p-2">
                          <div className="flex justify-between text-sm">
                            <span>{l.lesson_title}</span>
                            <span className="text-muted-foreground">{l.progress_percent}%</span>
                          </div>
                          <Progress value={l.progress_percent} className="mt-1 h-1.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">{fr ? 'Dernières évaluations' : 'Latest evaluations'}</p>
                    <div className="space-y-1">
                      {evals
                        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
                        .slice(0, 5)
                        .map((e, i) => (
                          <div key={i} className="flex justify-between text-sm rounded-md bg-muted/40 px-2 py-1.5">
                            <span className="truncate mr-2">{e.exam_title}</span>
                            <span className="font-medium shrink-0">{Number(e.percent).toFixed(0)}%</span>
                          </div>
                        ))}
                      {evals.length === 0 && <p className="text-xs text-muted-foreground">{fr ? 'Aucune évaluation.' : 'No evaluation yet.'}</p>}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
        {students.length === 0 && <p className="text-muted-foreground">{fr ? 'Aucune activité enregistrée.' : 'No activity recorded.'}</p>}
      </CardContent>
    </Card>
  );
}