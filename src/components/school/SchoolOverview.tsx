import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, BookOpen, Coins, GraduationCap, TrendingUp, Users } from 'lucide-react';

interface Props {
  establishmentId: string;
  referralCode: string | null;
}

export default function SchoolOverview({ establishmentId, referralCode }: Props) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [loading, setLoading] = useState(true);
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

      const rows = (results.data as { percent: number }[] | null) || [];
      const acts = (activity.data as { status: string }[] | null) || [];
      const coms = (commissions.data as { amount: number; status: string }[] | null) || [];

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

  const cards = [
    { icon: Users, label: fr ? 'Élèves inscrits' : 'Enrolled students', value: stats.students, hint: `${stats.activeStudents} ${fr ? 'actifs' : 'active'}` },
    { icon: GraduationCap, label: fr ? 'Classes suivies' : 'Tracked classes', value: stats.classes },
    { icon: TrendingUp, label: fr ? 'Moyenne générale' : 'Overall average', value: `${stats.average}%`, hint: `${stats.evaluations} ${fr ? 'évaluations' : 'evaluations'}` },
    { icon: Award, label: fr ? 'Challenges actifs' : 'Active challenges', value: stats.challenges },
    { icon: BookOpen, label: fr ? 'Leçons terminées' : 'Lessons completed', value: stats.lessonsRead },
    { icon: Coins, label: fr ? 'Revenus cumulés' : 'Total revenue', value: `${stats.revenue.toLocaleString()} FCFA`, hint: `${stats.available.toLocaleString()} FCFA ${fr ? 'disponibles' : 'available'}` },
  ];

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{fr ? 'Code de parrainage de l’établissement' : 'School referral code'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Badge variant="secondary" className="text-base px-3 py-1 font-mono">{referralCode || '—'}</Badge>
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