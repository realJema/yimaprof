import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Award, BookOpen, Clock, Coins, GraduationCap, TrendingUp, Upload, Users, FilePlus2, BarChart3, AlertTriangle } from 'lucide-react';

interface Props {
  establishmentId: string;
  referralCode: string | null;
  onNavigate?: (tab: string) => void;
}

interface ResultRow { student_id: string; student_name: string; percent: number; subject_name: string }
interface ActivityRow { student_id: string; status: string; time_spent_seconds: number; last_viewed_at: string }

export default function SchoolOverview({ establishmentId, referralCode, onNavigate }: Props) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [loading, setLoading] = useState(true);
  const [top, setTop] = useState<{ name: string; percent: number }[]>([]);
  const [atRisk, setAtRisk] = useState<{ name: string; percent: number }[]>([]);
  const [stats, setStats] = useState({
    students: 0,
    activeStudents: 0,
    classes: 0,
    challenges: 0,
    revenue: 0,
    available: 0,
    average: 0,
    evaluations: 0,
    lessonsRead: 0,
    engaged7d: 0,
    hours: 0,
    lessonsInProgress: 0,
  });

  useEffect(() => {
    (async () => {
      const [students, classes, challenges, commissions, results, activity] = await Promise.all([
        supabase.from('establishment_students').select('id, status').eq('establishment_id', establishmentId),
        supabase.from('establishment_classes').select('id').eq('establishment_id', establishmentId),
        supabase.from('challenges').select('id, status').eq('establishment_id', establishmentId),
        supabase.from('establishment_commissions').select('amount, status').eq('establishment_id', establishmentId),
        supabase.rpc('establishment_results', { p_establishment_id: establishmentId }),
        supabase.rpc('establishment_student_activity', { p_establishment_id: establishmentId }),
      ]);

      const rows = (results.data as ResultRow[] | null) || [];
      const acts = (activity.data as ActivityRow[] | null) || [];
      const coms = (commissions.data as { amount: number; status: string }[] | null) || [];

      const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
      const engaged = new Set(
        acts.filter((a) => a.last_viewed_at && new Date(a.last_viewed_at).getTime() > weekAgo).map((a) => a.student_id),
      );

      const perStudent = new Map<string, { name: string; sum: number; count: number }>();
      rows.forEach((r) => {
        const cur = perStudent.get(r.student_id) || { name: r.student_name, sum: 0, count: 0 };
        perStudent.set(r.student_id, { name: r.student_name, sum: cur.sum + Number(r.percent), count: cur.count + 1 });
      });
      const ranked = Array.from(perStudent.values())
        .map((s) => ({ name: s.name, percent: Math.round(s.sum / s.count) }))
        .sort((a, b) => b.percent - a.percent);
      setTop(ranked.slice(0, 5));
      setAtRisk(ranked.filter((s) => s.percent < 50).slice(-5).reverse());

      setStats({
        students: students.data?.length || 0,
        activeStudents: (students.data || []).filter((s) => s.status === 'active').length,
        classes: classes.data?.length || 0,
        challenges: (challenges.data || []).filter((c) => c.status === 'active').length,
        revenue: coms.reduce((sum, c) => sum + c.amount, 0),
        available: coms.filter((c) => c.status === 'available').reduce((sum, c) => sum + c.amount, 0),
        average: rows.length ? Math.round(rows.reduce((s, r) => s + Number(r.percent), 0) / rows.length) : 0,
        evaluations: rows.length,
        lessonsRead: acts.filter((a) => a.status === 'completed').length,
        engaged7d: engaged.size,
        hours: Math.round(acts.reduce((s, a) => s + (a.time_spent_seconds || 0), 0) / 3600),
        lessonsInProgress: acts.filter((a) => a.status === 'in_progress').length,
      });
      setLoading(false);
    })();
  }, [establishmentId]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
    );
  }

  const engagementRate = stats.students ? Math.round((stats.engaged7d / stats.students) * 100) : 0;

  const cards = [
    { icon: Users, label: fr ? 'Mes élèves' : 'My students', value: stats.students, hint: `${stats.activeStudents} ${fr ? 'actifs' : 'active'}` },
    { icon: TrendingUp, label: fr ? 'Moyenne des élèves' : 'Student average', value: `${stats.average}%`, hint: `${stats.evaluations} ${fr ? 'évaluations passées' : 'evaluations taken'}` },
    { icon: BarChart3, label: fr ? 'Élèves actifs (7 j)' : 'Active students (7d)', value: stats.engaged7d, hint: `${engagementRate}% ${fr ? "de l'effectif" : 'of enrolment'}` },
    { icon: BookOpen, label: fr ? 'Leçons terminées' : 'Lessons completed', value: stats.lessonsRead, hint: `${stats.lessonsInProgress} ${fr ? 'en cours' : 'in progress'}` },
    { icon: Clock, label: fr ? "Temps d'étude cumulé" : 'Total study time', value: `${stats.hours} h`, hint: fr ? 'toutes classes confondues' : 'all classes' },
    { icon: GraduationCap, label: fr ? 'Classes suivies' : 'Tracked classes', value: stats.classes, hint: `${stats.challenges} ${fr ? 'challenges actifs' : 'active challenges'}` },
  ];

  const actions = [
    { icon: Upload, label: fr ? 'Importer des élèves' : 'Import students', tab: 'students' },
    { icon: FilePlus2, label: fr ? 'Ajouter un contenu' : 'Add content', tab: 'content' },
    { icon: Award, label: fr ? 'Créer un challenge' : 'Create a challenge', tab: 'challenges' },
    { icon: BarChart3, label: fr ? 'Voir les résultats' : 'View results', tab: 'results' },
    { icon: GraduationCap, label: fr ? 'Gérer les classes' : 'Manage classes', tab: 'classes' },
    { icon: Coins, label: fr ? 'Revenus & parrainage' : 'Revenue & referrals', tab: 'revenue' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{fr ? 'Actions rapides' : 'Quick actions'}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((a) => (
            <Button key={a.tab} variant="outline" className="justify-start" onClick={() => onNavigate?.(a.tab)}>
              <a.icon className="h-4 w-4 mr-2 text-secondary" />
              {a.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold mt-1">{c.value}</p>
                  {c.hint && <p className="text-xs text-muted-foreground mt-1">{c.hint}</p>}
                </div>
                <c.icon className="h-5 w-5 text-secondary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><Award className="h-4 w-4 text-secondary" />{fr ? 'Meilleurs élèves' : 'Top students'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {top.length === 0 && <p className="text-sm text-muted-foreground">{fr ? 'Pas encore de résultats.' : 'No results yet.'}</p>}
            {top.map((s, i) => (
              <div key={s.name + i} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{i + 1}. {s.name}</span>
                  <span className="font-semibold">{s.percent}%</span>
                </div>
                <Progress value={s.percent} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />{fr ? 'Élèves à accompagner' : 'Students needing support'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {atRisk.length === 0 && <p className="text-sm text-muted-foreground">{fr ? 'Aucun élève sous la barre des 50%.' : 'No student below 50%.'}</p>}
            {atRisk.map((s, i) => (
              <div key={s.name + i} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="font-semibold text-destructive">{s.percent}%</span>
                </div>
                <Progress value={s.percent} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{fr ? 'Code de parrainage de l’établissement' : 'School referral code'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Badge variant="secondary" className="text-base px-3 py-1 font-mono">{referralCode || '—'}</Badge>
          <p className="text-sm font-medium">
            {fr ? 'Revenus cumulés' : 'Total revenue'}: {stats.revenue.toLocaleString()} FCFA
            <span className="text-muted-foreground font-normal"> · {stats.available.toLocaleString()} FCFA {fr ? 'disponibles' : 'available'}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {fr
              ? 'Chaque abonnement souscrit avec ce code génère une commission pour votre établissement.'
              : 'Every subscription bought with this code generates a commission for your school.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}