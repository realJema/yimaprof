import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, RefreshCw } from 'lucide-react';

interface Row {
  id: string; revenue_type: 'yima' | 'tx' | 'establishment'; amount: number; currency: string;
  origin: string; origin_detail: string | null; occurred_at: string; status: 'success' | 'pending' | 'failed'; reference: string | null;
}

const TYPE_LABEL = { yima: 'Revenu Yima', tx: 'Revenu TX', establishment: 'Revenu Établissement' } as const;
const TYPE_CLASS = {
  yima: 'bg-primary/10 text-primary border-primary/30',
  tx: 'bg-muted text-muted-foreground border-border',
  establishment: 'bg-secondary/10 text-secondary border-secondary/30',
} as const;

/** Full admin revenue history: Yima share, TX tax on payouts, school commissions. */
export function RevenueLedger() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_revenue_ledger' as never);
    setRows(((data as Row[]) || []).map((r) => ({ ...r, amount: Number(r.amount) })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (type !== 'all' && r.revenue_type !== type) return false;
    if (status !== 'all' && r.status !== status) return false;
    const d = new Date(r.occurred_at);
    if (from && d < new Date(from + 'T00:00:00')) return false;
    if (to && d > new Date(to + 'T23:59:59')) return false;
    return true;
  }), [rows, type, status, from, to]);

  const totals = useMemo(() => {
    const t = { yima: 0, tx: 0, establishment: 0 };
    filtered.filter((r) => r.status === 'success').forEach((r) => { t[r.revenue_type] += r.amount; });
    return t;
  }, [filtered]);

  const statusBadge = (s: Row['status']) => (
    <Badge variant={s === 'success' ? 'default' : s === 'failed' ? 'destructive' : 'secondary'}>
      {s === 'success' ? (fr ? 'Succès' : 'Success') : s === 'failed' ? 'Failed' : 'Pending'}
    </Badge>
  );

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />{fr ? 'Historique des revenus' : 'Revenue history'}</CardTitle>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {(['yima', 'tx', 'establishment'] as const).map((k) => (
            <div key={k} className={`rounded-lg border p-3 ${TYPE_CLASS[k]}`}>
              <p className="text-xs">{TYPE_LABEL[k]}</p>
              <p className="text-lg font-bold">{totals[k].toLocaleString()} FCFA</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>{fr ? 'Type de revenu' : 'Revenue type'}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{fr ? 'Tous' : 'All'}</SelectItem>
                <SelectItem value="yima">Revenu Yima</SelectItem>
                <SelectItem value="tx">Revenu TX</SelectItem>
                <SelectItem value="establishment">Revenu Établissement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>{fr ? 'Date de début' : 'Start date'}</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>{fr ? 'Date de fin' : 'End date'}</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div>
            <Label>{fr ? 'Statut' : 'Status'}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{fr ? 'Tous' : 'All'}</SelectItem>
                <SelectItem value="success">{fr ? 'Succès' : 'Success'}</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? <Skeleton className="h-64 w-full" /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{fr ? 'Date et heure' : 'Date & time'}</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>{fr ? 'Origine' : 'Origin'}</TableHead>
                  <TableHead>{fr ? 'Montant reçu' : 'Amount received'}</TableHead>
                  <TableHead>{fr ? 'Statut' : 'Status'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 500).map((r) => (
                  <TableRow key={`${r.revenue_type}-${r.id}`}>
                    <TableCell className="text-sm whitespace-nowrap">{new Date(r.occurred_at).toLocaleString(fr ? 'fr-FR' : 'en-GB')}</TableCell>
                    <TableCell><Badge variant="outline" className={TYPE_CLASS[r.revenue_type]}>{TYPE_LABEL[r.revenue_type]}</Badge></TableCell>
                    <TableCell>
                      <div className="font-medium">{r.origin}</div>
                      {r.origin_detail && <div className="text-xs text-muted-foreground">{r.origin_detail}</div>}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{r.amount.toLocaleString()} {r.currency}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">{fr ? 'Aucune opération.' : 'No operation.'}</p>}
            {filtered.length > 500 && <p className="text-xs text-muted-foreground pt-2">{fr ? '500 premières lignes affichées — affinez les filtres.' : 'First 500 rows shown — refine filters.'}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
