import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, ShieldOff, UserPlus } from 'lucide-react';

interface Commercial {
  user_id: string;
  username: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  referred_count: number;
  active_referrals: number;
  total_earned: number;
  pending_earned: number;
  paid_earned: number;
  last_referral_at: string | null;
}

export default function CommercialManagement() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Commercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_commercials');
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    setRows(((data as unknown as Commercial[]) || []));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCommercial = async (userId: string, enabled: boolean) => {
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_set_commercial', { p_user_id: userId, p_enabled: enabled });
    setBusy(false);
    const res = data as { success?: boolean; error?: string } | null;
    if (error || res?.error) {
      toast({ title: 'Erreur', description: error?.message || res?.error, variant: 'destructive' });
      return;
    }
    toast({ title: enabled ? 'Droits commercial accordés' : 'Droits commercial retirés' });
    load();
  };

  const grantByEmail = async () => {
    const target = email.trim().toLowerCase();
    if (!target) return;
    setBusy(true);
    const { data: profile } = await supabase.from('profiles').select('id').ilike('email', target).maybeSingle();
    setBusy(false);
    if (!profile) {
      toast({ title: 'Utilisateur introuvable', description: target, variant: 'destructive' });
      return;
    }
    setEmail('');
    await setCommercial(profile.id, true);
  };

  const money = (v: number) => `${(v || 0).toLocaleString('fr-FR')} FCFA`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accorder les droits commercial</CardTitle>
          <CardDescription>
            Un utilisateur normal devient commercial : il obtient son tableau de bord et une affiliation approuvée.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" />
          <Button onClick={grantByEmail} disabled={busy || !email.trim()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Accorder
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commerciaux ({rows.length})</CardTitle>
          <CardDescription>Performance d'affiliation de chaque commercial.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun commercial pour le moment.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commercial</TableHead>
                  <TableHead>Filleuls</TableHead>
                  <TableHead>Commissions</TableHead>
                  <TableHead>Dernier filleul</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.user_id}>
                    <TableCell>
                      <div className="font-medium">
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.username ? `@${c.username} · ` : ''}{c.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.referred_count} <Badge variant="outline" className="ml-1">{c.active_referrals} actifs</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{money(c.total_earned)}</div>
                      <div className="text-xs text-muted-foreground">
                        {money(c.pending_earned)} en attente · {money(c.paid_earned)} payé
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {c.last_referral_at ? new Date(c.last_referral_at).toLocaleDateString('fr-FR') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setCommercial(c.user_id, false)}>
                        <ShieldOff className="mr-2 h-4 w-4" />
                        Retirer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        Les commissions sont calculées automatiquement (10 %) lors des paiements des filleuls.
      </p>
    </div>
  );
}
