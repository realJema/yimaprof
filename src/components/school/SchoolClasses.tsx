import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap } from 'lucide-react';

interface ClassRow {
  id: string;
  label: string | null;
  teacher_name: string | null;
  class_id: string;
  classes: { display_name: string } | null;
}

interface ResultRow { class_id: string; percent: number; student_id: string }

export default function SchoolClasses({ establishmentId }: { establishmentId: string }) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: cl }, { data: st }, res] = await Promise.all([
        supabase.from('establishment_classes').select('id, label, teacher_name, class_id, classes(display_name)').eq('establishment_id', establishmentId),
        supabase.from('establishment_students').select('class_id').eq('establishment_id', establishmentId),
        supabase.rpc('establishment_results', { p_establishment_id: establishmentId }),
      ]);
      setRows((cl as unknown as ClassRow[]) || []);
      setResults((res.data as unknown as ResultRow[]) || []);
      const c: Record<string, number> = {};
      (st || []).forEach((s) => { if (s.class_id) c[s.class_id] = (c[s.class_id] || 0) + 1; });
      setCounts(c);
      setLoading(false);
    })();
  }, [establishmentId]);

  if (loading) return <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}</div>;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => {
        const classResults = results.filter((r) => r.class_id === row.class_id);
        const avg = classResults.length ? Math.round(classResults.reduce((s, r) => s + Number(r.percent), 0) / classResults.length) : 0;
        const activeStudents = new Set(classResults.map((r) => r.student_id)).size;
        return (
          <Card key={row.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-secondary" />
                  {row.label || row.classes?.display_name}
                </span>
                <Badge variant="outline">{counts[row.class_id] || 0} {fr ? 'élèves' : 'students'}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {fr ? 'Enseignant' : 'Teacher'}: {row.teacher_name || '—'}
              </p>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{fr ? 'Moyenne de la classe' : 'Class average'}</span>
                  <span className="font-semibold">{avg}%</span>
                </div>
                <Progress value={avg} />
              </div>
              <p className="text-xs text-muted-foreground">
                {activeStudents} {fr ? 'élèves ont déjà passé une évaluation' : 'students already took an evaluation'} · {classResults.length} {fr ? 'évaluations' : 'evaluations'}
              </p>
            </CardContent>
          </Card>
        );
      })}
      {rows.length === 0 && <p className="text-muted-foreground">{fr ? 'Aucune classe enregistrée.' : 'No class registered yet.'}</p>}
    </div>
  );
}