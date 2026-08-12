import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { BarChart3 } from 'lucide-react';

interface ResultRow {
  student_id: string;
  student_name: string;
  class_id: string | null;
  class_name: string | null;
  subject_name: string | null;
  exam_title: string;
  percent: number;
  completed_at: string;
}

export default function SchoolResults({ establishmentId }: { establishmentId: string }) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('establishment_results', { p_establishment_id: establishmentId });
      setRows((data as unknown as ResultRow[]) || []);
      setLoading(false);
    })();
  }, [establishmentId]);

  const classes = useMemo(() => Array.from(new Set(rows.map((r) => r.class_name).filter(Boolean))) as string[], [rows]);
  const filtered = classFilter === 'all' ? rows : rows.filter((r) => r.class_name === classFilter);

  const bySubject = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    filtered.forEach((r) => {
      const key = r.subject_name || '—';
      const cur = map.get(key) || { total: 0, count: 0 };
      map.set(key, { total: cur.total + Number(r.percent), count: cur.count + 1 });
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, average: Math.round(v.total / v.count), count: v.count }))
      .sort((a, b) => b.average - a.average);
  }, [filtered]);

  const topStudents = useMemo(() => {
    const map = new Map<string, { name: string; className: string | null; total: number; count: number }>();
    filtered.forEach((r) => {
      const cur = map.get(r.student_id) || { name: r.student_name, className: r.class_name, total: 0, count: 0 };
      map.set(r.student_id, { ...cur, total: cur.total + Number(r.percent), count: cur.count + 1 });
    });
    return Array.from(map.values())
      .map((s) => ({ ...s, average: Math.round(s.total / s.count) }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);
  }, [filtered]);

  if (loading) return <Skeleton className="h-64 w-full" />;

  const overall = filtered.length ? Math.round(filtered.reduce((s, r) => s + Number(r.percent), 0) / filtered.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filtered.length} {fr ? 'évaluations' : 'evaluations'} · {fr ? 'moyenne' : 'average'} <span className="font-semibold text-foreground">{overall}%</span>
        </p>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{fr ? 'Toutes les classes' : 'All classes'}</SelectItem>
            {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" />{fr ? 'Moyenne par matière' : 'Average per subject'}</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bySubject}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="average" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">{fr ? 'Meilleurs élèves' : 'Top students'}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{fr ? 'Élève' : 'Student'}</TableHead>
                <TableHead>{fr ? 'Classe' : 'Class'}</TableHead>
                <TableHead>{fr ? 'Évaluations' : 'Evaluations'}</TableHead>
                <TableHead>{fr ? 'Moyenne' : 'Average'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topStudents.map((s, i) => (
                <TableRow key={s.name + i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.className || '—'}</TableCell>
                  <TableCell>{s.count}</TableCell>
                  <TableCell className="font-semibold">{s.average}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}