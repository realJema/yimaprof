import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, School, Users, Trophy, Activity } from 'lucide-react';

interface SchoolRow {
  establishment_id: string;
  name: string;
  city: string | null;
  approval_status: string;
  is_demo: boolean;
  owner_email: string | null;
  referral_code: string | null;
  students_total: number;
  students_active: number;
  students_with_account: number;
  classes_count: number;
  lessons_count: number;
  challenges_total: number;
  challenges_active: number;
  evaluations_count: number;
  lessons_completed: number;
  average_percent: number;
  commissions_total: number;
  commissions_pending: number;
  last_activity: string | null;
  created_at: string;
}

interface ChallengeRow {
  challenge_id: string;
  establishment_id: string;
  establishment_name: string;
  title: string;
  scope: string;
  status: string;
  starts_at: string;
  ends_at: string;
  participants: number;
  average_percent: number;
}

export default function SchoolActivity() {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase.rpc('admin_school_activity'),
        supabase.rpc('admin_school_challenges'),
      ]);
      setSchools(((s as unknown as SchoolRow[]) || []));
      setChallenges(((c as unknown as ChallengeRow[]) || []));
      setLoading(false);
    })();
  }, []);

  const money = (v: number) => `${(v || 0).toLocaleString('fr-FR')} FCFA`;
  const totals = schools.reduce(
    (acc, s) => ({
      students: acc.students + Number(s.students_total || 0),
      evaluations: acc.evaluations + Number(s.evaluations_count || 0),
      challenges: acc.challenges + Number(s.challenges_total || 0),
    }),
    { students: 0, evaluations: 0, challenges: 0 },
  );

  if (loading) {
    return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: School, label: 'Établissements', value: schools.length },
          { icon: Users, label: 'Élèves inscrits', value: totals.students },
          { icon: Activity, label: 'Évaluations', value: totals.evaluations },
          { icon: Trophy, label: 'Défis créés', value: totals.challenges },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activité des établissements</CardTitle>
          <CardDescription>Élèves, contenus, défis et résultats par école.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>École</TableHead>
                <TableHead>Élèves</TableHead>
                <TableHead>Classes / Leçons</TableHead>
                <TableHead>Défis</TableHead>
                <TableHead>Évaluations</TableHead>
                <TableHead>Moyenne</TableHead>
                <TableHead>Commissions</TableHead>
                <TableHead>Dernière activité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((s) => (
                <TableRow key={s.establishment_id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      {s.name}
                      {s.is_demo && <Badge variant="outline">démo</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.city ? `${s.city} · ` : ''}{s.owner_email || 'sans propriétaire'}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.students_total}
                    <div className="text-xs text-muted-foreground">
                      {s.students_active} actifs · {s.students_with_account} comptes
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{s.classes_count} / {s.lessons_count}</TableCell>
                  <TableCell className="text-sm">
                    {s.challenges_total}
                    <div className="text-xs text-muted-foreground">{s.challenges_active} en cours</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.evaluations_count}
                    <div className="text-xs text-muted-foreground">{s.lessons_completed} leçons terminées</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={Number(s.average_percent) >= 50 ? 'default' : 'secondary'}>
                      {Number(s.average_percent || 0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {money(s.commissions_total)}
                    <div className="text-xs text-muted-foreground">{money(s.commissions_pending)} en attente</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {s.last_activity ? new Date(s.last_activity).toLocaleDateString('fr-FR') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Défis scolaires ({challenges.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {challenges.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun défi créé pour le moment.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Défi</TableHead>
                  <TableHead>École</TableHead>
                  <TableHead>Portée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Moyenne</TableHead>
                  <TableHead>Période</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {challenges.map((c) => (
                  <TableRow key={c.challenge_id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="text-sm">{c.establishment_name}</TableCell>
                    <TableCell className="text-sm">{c.scope}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.participants}</TableCell>
                    <TableCell className="text-sm">{Number(c.average_percent || 0)}%</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(c.starts_at).toLocaleDateString('fr-FR')} → {new Date(c.ends_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
