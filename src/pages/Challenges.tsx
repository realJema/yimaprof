import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import SeoHead from '@/components/SeoHead';
import AuthInvitation from '@/components/auth/AuthInvitation';
import { Award, CalendarDays, Clock, Flag, Globe2, School, Trophy, CheckCircle2 } from 'lucide-react';

interface ChallengeRow {
  id: string;
  title: string;
  description: string | null;
  scope: string;
  region: string | null;
  status: string;
  reward: string | null;
  starts_at: string | null;
  eligible_series_ids: string[] | null;
  ends_at: string;
  exam_id: string | null;
  duration_minutes: number;
  graded_out_of: number;
  establishment_id: string | null;
  eligible_class_ids: string[] | null;
}

const scopeMeta: Record<string, { icon: typeof School; fr: string; en: string; className: string }> = {
  establishment: { icon: School, fr: 'Établissement', en: 'School', className: 'bg-primary/10 text-primary border-primary/20' },
  regional: { icon: Flag, fr: 'Régional', en: 'Regional', className: 'bg-secondary/10 text-secondary border-secondary/20' },
  national: { icon: Globe2, fr: 'National', en: 'National', className: 'bg-accent/10 text-accent border-accent/20' },
};

export default function Challenges() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { user } = useAuth();
  const { hasActiveSubscription, loading: subLoading } = useSubscription();
  const [seriesList, setSeriesList] = useState<{ id: string; code: string }[]>([]);
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [attempted, setAttempted] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: se } = await supabase.from('series').select('id, code').eq('is_active', true).order('order_number');
      setSeriesList(se || []);
      const { data } = await supabase
        .from('challenges')
        .select('id, title, description, scope, region, status, reward, starts_at, ends_at, exam_id, duration_minutes, graded_out_of, establishment_id, eligible_class_ids, eligible_series_ids')
        .eq('review_status', 'approved')
        .order('ends_at', { ascending: true });
      setChallenges((data as unknown as ChallengeRow[]) || []);

      if (user) {
        const { data: att } = await supabase
          .from('challenge_attempts')
          .select('challenge_id, status')
          .eq('user_id', user.id);
        const map: Record<string, string> = {};
        (att || []).forEach((a: any) => { map[a.challenge_id] = a.status; });
        setAttempted(map);
      }
      setLoading(false);
    })();
  }, [user]);

  const visible = challenges.filter((c) => seriesFilter === 'all' || !(c.eligible_series_ids || []).length || (c.eligible_series_ids || []).includes(seriesFilter));

  if (loading || subLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <SeoHead
        title={fr ? 'Challenges et compétitions | Yimaprof' : 'Challenges and competitions | Yimaprof'}
        description={fr ? 'Participez aux challenges scolaires, régionaux et nationaux de Yimaprof.' : 'Take part in Yimaprof school, regional and national challenges.'}
        path="/challenges"
      />

      <div className="mb-8 border-b border-primary/20 bg-primary/5 p-6 text-foreground sm:p-8">
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7" />
          <h1 className="text-2xl font-bold sm:text-3xl">{fr ? 'Challenges' : 'Challenges'}</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {fr
            ? 'Osez le défi, révélez votre talent et faites briller votre potentiel !'
            : 'Rise to the challenge, reveal your talent and let your potential shine!'}
        </p>
      </div>

      {!user ? <AuthInvitation /> : !hasActiveSubscription ? (
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <p className="text-muted-foreground">
              {fr ? 'Les challenges sont réservés aux membres inscrits avec un abonnement actif.' : 'Challenges are reserved for registered members with an active subscription.'}
            </p>
            <Button asChild>
              <Link to={user ? '/subscriptions' : '/auth'}>{user ? (fr ? 'Voir les offres' : 'See plans') : (fr ? 'Se connecter' : 'Sign in')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (<>
      {seriesList.length > 0 && challenges.length > 0 && (
        <div className="mb-4 flex justify-end">
          <Select value={seriesFilter} onValueChange={setSeriesFilter}>
            <SelectTrigger className="w-56"><SelectValue placeholder={fr ? 'Série / Filière' : 'Series / Track'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{fr ? 'Toutes les séries' : 'All series'}</SelectItem>
              {seriesList.map((s) => <SelectItem key={s.id} value={s.id}>{s.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {visible.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {fr ? 'Aucun challenge disponible pour le moment' : 'No challenge available at the moment'}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((ch) => {
          const meta = scopeMeta[ch.scope] ?? scopeMeta.establishment;
          const ScopeIcon = meta.icon;
          const done = attempted[ch.id] === 'submitted';
          const ended = new Date(ch.ends_at).getTime() < Date.now();
          const scheduled = !!ch.starts_at && new Date(ch.starts_at).getTime() > Date.now();

          return (
            <Card key={ch.id} className="group flex flex-col overflow-hidden transition-shadow hover:shadow-medium">
              <CardHeader className="pb-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={meta.className}>
                    <ScopeIcon className="mr-1 h-3 w-3" />
                    {fr ? meta.fr : meta.en}
                    {ch.region ? ` · ${ch.region}` : ''}
                  </Badge>
                  <Badge variant={ch.status === 'active' && !ended ? 'secondary' : 'outline'}>
                    {ended ? (fr ? 'Terminé' : 'Ended') : scheduled ? (fr ? 'À venir' : 'Upcoming') : ch.status === 'active' ? (fr ? 'En cours' : 'Live') : (fr ? 'Inactif' : 'Inactive')}
                  </Badge>
                  {done && (
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="mr-1 h-3 w-3" />{fr ? 'Déjà passé' : 'Completed'}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base">{ch.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {ch.description && <p className="line-clamp-3 text-sm text-muted-foreground">{ch.description}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {fr ? 'Fin : ' : 'Ends: '}{new Date(ch.ends_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')}
                  </span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{ch.duration_minutes} min</span>
                  <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5" />/{ch.graded_out_of}</span>
                </div>
                {ch.reward && <p className="text-xs text-secondary">🏅 {ch.reward}</p>}
                <Button asChild className="mt-auto w-full">
                  <Link to={`/challenges/${ch.id}`}>{fr ? 'Voir le challenge' : 'View challenge'}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      </>)}
    </div>
  );
}
