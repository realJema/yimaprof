import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Copy, Loader2, TrendingUp, Users, Wallet, CalendarDays } from 'lucide-react';

interface Overview {
  username: string | null;
  referred_total: number;
  referred_active: number;
  referred_this_month: number;
  total_earned: number;
  pending_earned: number;
  paid_earned: number;
  earned_this_month: number;
  monthly: Array<{ month: string; amount: number; conversions: number }>;
}

interface Referral {
  subscription_id: string;
  referred_name: string | null;
  referred_username: string | null;
  plan_name: string | null;
  amount: number | null;
  status: string | null;
  commission: number | null;
  commission_status: string | null;
  subscribed_at: string | null;
  expires_at: string | null;
}

export default function CommercialDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isCommercial, isAdmin, loading: rolesLoading } = useUserRoles();
  const { language } = useLanguage();
  const { toast } = useToast();
  const fr = language === 'fr';
  const [overview, setOverview] = useState<Overview | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || rolesLoading || (!isCommercial && !isAdmin)) return;
    (async () => {
      setLoading(true);
      const [{ data: ov }, { data: refs }] = await Promise.all([
        supabase.rpc('commercial_overview'),
        supabase.rpc('commercial_referrals'),
      ]);
      setOverview((ov as unknown as Overview) ?? null);
      setReferrals(((refs as unknown as Referral[]) || []));
      setLoading(false);
    })();
  }, [user, rolesLoading, isCommercial, isAdmin]);

  if (authLoading || rolesLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isCommercial && !isAdmin) return <Navigate to="/dashboard" replace />;

  const link = overview?.username
    ? `${window.location.origin}/subscriptions?ref=${overview.username}`
    : null;

  const money = (v: number | null | undefined) => `${(v ?? 0).toLocaleString('fr-FR')} FCFA`;

  const stats = [
    { icon: Users, label: fr ? 'Filleuls' : 'Referrals', value: overview?.referred_total ?? 0, hint: `${overview?.referred_active ?? 0} ${fr ? 'actifs' : 'active'}` },
    { icon: CalendarDays, label: fr ? 'Ce mois' : 'This month', value: overview?.referred_this_month ?? 0, hint: money(overview?.earned_this_month) },
    { icon: Wallet, label: fr ? 'Commissions totales' : 'Total commissions', value: money(overview?.total_earned), hint: `${money(overview?.pending_earned)} ${fr ? 'en attente' : 'pending'}` },
    { icon: TrendingUp, label: fr ? 'Déjà payé' : 'Already paid', value: money(overview?.paid_earned), hint: fr ? 'versements confirmés' : 'confirmed payouts' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{fr ? 'Espace Commercial' : 'Commercial space'}</h1>
          <p className="text-sm text-muted-foreground">
            {fr ? 'Suivez vos filleuls et vos commissions en temps réel.' : 'Track your referrals and commissions in real time.'}
          </p>
        </div>
        <Badge variant="secondary">{fr ? 'Profil commercial' : 'Commercial profile'}</Badge>
      </div>

      {link && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{fr ? 'Votre lien de parrainage' : 'Your referral link'}</CardTitle>
            <CardDescription>{fr ? 'Partagez ce lien : chaque abonnement souscrit vous rapporte 10 %.' : 'Share this link: you earn 10% on every subscription.'}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-sm">{link}</code>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(link);
                toast({ title: fr ? 'Lien copié' : 'Link copied' });
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              {fr ? 'Copier' : 'Copy'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{fr ? 'Commissions par mois' : 'Commissions per month'}</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {(overview?.monthly || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{fr ? 'Aucune commission pour le moment.' : 'No commission yet.'}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview?.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{fr ? 'Détail des filleuls' : 'Referral details'}</CardTitle>
          <CardDescription>{referrals.length} {fr ? 'abonnement(s) attribué(s)' : 'attributed subscription(s)'}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">{fr ? 'Aucun filleul pour le moment.' : 'No referral yet.'}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{fr ? 'Filleul' : 'Referral'}</TableHead>
                  <TableHead>{fr ? 'Offre' : 'Plan'}</TableHead>
                  <TableHead>{fr ? 'Montant' : 'Amount'}</TableHead>
                  <TableHead>{fr ? 'Statut' : 'Status'}</TableHead>
                  <TableHead>{fr ? 'Commission' : 'Commission'}</TableHead>
                  <TableHead>{fr ? 'Date' : 'Date'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((r) => (
                  <TableRow key={r.subscription_id}>
                    <TableCell className="font-medium">
                      {r.referred_username ? `@${r.referred_username}` : r.referred_name || '—'}
                    </TableCell>
                    <TableCell>{r.plan_name || '—'}</TableCell>
                    <TableCell>{money(r.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status || '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      {money(r.commission)}{' '}
                      {r.commission_status && (
                        <Badge variant="outline" className="ml-1">{r.commission_status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {r.subscribed_at ? new Date(r.subscribed_at).toLocaleDateString(fr ? 'fr-FR' : 'en-US') : '—'}
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
