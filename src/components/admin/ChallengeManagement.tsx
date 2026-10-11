import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, ExternalLink, FileJson, Trophy, XCircle } from 'lucide-react';

interface Row {
  id: string;
  title: string;
  description: string | null;
  ends_at: string;
  duration_minutes: number;
  review_status: string;
  review_note: string | null;
  pdf_url: string | null;
  exam_id: string | null;
  questions: unknown;
  eligible_series_ids: string[] | null;
  establishment_id: string | null;
  establishments: { name: string } | null;
  created_at: string;
}

const hasQuestions = (q: unknown) =>
  Array.isArray(q) ? q.length > 0 : !!q && typeof q === 'object' && Object.keys(q as object).length > 0;

export function ChallengeManagement() {
  const { language } = useLanguage();
  const fr = language !== 'en';
  const [rows, setRows] = useState<Row[]>([]);
  const [series, setSeries] = useState<{ id: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [editing, setEditing] = useState<Row | null>(null);
  const [json, setJson] = useState('');
  const [examId, setExamId] = useState('');
  const [note, setNote] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: se }] = await Promise.all([
      supabase
        .from('challenges')
        .select('id, title, description, ends_at, duration_minutes, review_status, review_note, pdf_url, exam_id, questions, eligible_series_ids, establishment_id, created_at, establishments(name)')
        .order('created_at', { ascending: false }),
      supabase.from('series').select('id, code').order('order_number'),
    ]);
    setRows((data as unknown as Row[]) || []);
    setSeries(se || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const list = useMemo(
    () => rows.filter((r) => (status === 'all' || r.review_status === status) &&
      (seriesFilter === 'all' || (r.eligible_series_ids || []).includes(seriesFilter))),
    [rows, status, seriesFilter],
  );
  const counts = useMemo(() => ({
    pending: rows.filter((r) => r.review_status === 'pending').length,
    approved: rows.filter((r) => r.review_status === 'approved').length,
    rejected: rows.filter((r) => r.review_status === 'rejected').length,
  }), [rows]);

  const open = (r: Row) => {
    setEditing(r);
    setJson(hasQuestions(r.questions) ? JSON.stringify(r.questions, null, 2) : '');
    setExamId(r.exam_id || '');
    setNote(r.review_note || '');
    setJsonError(null);
  };

  const parseJson = (): { ok: boolean; value: unknown } => {
    if (!json.trim()) return { ok: true, value: [] };
    try {
      const v = JSON.parse(json);
      if (!hasQuestions(v)) throw new Error(fr ? 'Le JSON ne contient aucune question.' : 'The JSON contains no question.');
      setJsonError(null);
      return { ok: true, value: v };
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : String(e));
      return { ok: false, value: null };
    }
  };

  const save = async (review: 'approved' | 'rejected' | null) => {
    if (!editing) return;
    const parsed = parseJson();
    if (!parsed.ok) return;
    const trimmedExam = examId.trim();
    if (trimmedExam && !/^[0-9a-f-]{36}$/i.test(trimmedExam)) {
      setJsonError(fr ? 'Identifiant d’épreuve invalide.' : 'Invalid paper ID.');
      return;
    }
    if (review === 'approved' && !trimmedExam && !hasQuestions(parsed.value)) {
      setJsonError(fr ? 'Ajoutez les questions (JSON) ou une épreuve avant de valider.' : 'Add questions (JSON) or a paper before approving.');
      return;
    }
    if (review === 'rejected' && !note.trim()) {
      setJsonError(fr ? 'Indiquez la raison du refus.' : 'Give a rejection reason.');
      return;
    }
    const patch: Record<string, unknown> = {
      questions: parsed.value,
      exam_id: trimmedExam || null,
      review_note: note.trim().slice(0, 500) || null,
    };
    if (review) {
      patch.review_status = review;
      patch.status = review === 'approved' ? 'active' : 'draft';
    }
    const { error } = await supabase.from('challenges').update(patch as never).eq('id', editing.id);
    if (error) { toast.error(error.message); return; }
    toast.success(review === 'approved' ? (fr ? 'Challenge validé' : 'Challenge approved') : review === 'rejected' ? (fr ? 'Challenge refusé' : 'Challenge rejected') : (fr ? 'Enregistré' : 'Saved'));
    setEditing(null);
    load();
  };

  const label = (s: string) => s === 'approved' ? (fr ? 'Validé' : 'Approved') : s === 'rejected' ? (fr ? 'Refusé' : 'Rejected') : (fr ? 'En attente' : 'Pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-secondary" />{fr ? 'Gestion des challenges' : 'Challenge management'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{fr ? 'En attente' : 'Pending'} ({counts.pending})</SelectItem>
              <SelectItem value="approved">{fr ? 'Validés' : 'Approved'} ({counts.approved})</SelectItem>
              <SelectItem value="rejected">{fr ? 'Refusés' : 'Rejected'} ({counts.rejected})</SelectItem>
              <SelectItem value="all">{fr ? 'Tous' : 'All'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={seriesFilter} onValueChange={setSeriesFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder={fr ? 'Série' : 'Series'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{fr ? 'Toutes les séries' : 'All series'}</SelectItem>
              {series.map((s) => <SelectItem key={s.id} value={s.id}>{s.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? <Skeleton className="h-40 w-full" /> : list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{fr ? 'Aucun challenge.' : 'No challenge.'}</p>
        ) : (
          <div className="space-y-2">
            {list.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.establishments?.name || 'Yimaprof'} · {fr ? 'Fin' : 'Ends'} {new Date(r.ends_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')} · {r.duration_minutes} min
                    {(r.eligible_series_ids || []).length > 0 && ` · ${(r.eligible_series_ids || []).map((id) => series.find((s) => s.id === id)?.code).filter(Boolean).join(', ')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(hasQuestions(r.questions) || r.exam_id) && <Badge variant="outline"><FileJson className="mr-1 h-3 w-3" />{fr ? 'Questions prêtes' : 'Questions ready'}</Badge>}
                  <Badge variant={r.review_status === 'rejected' ? 'destructive' : r.review_status === 'approved' ? 'secondary' : 'outline'}>{label(r.review_status)}</Badge>
                  <Button size="sm" variant="outline" onClick={() => open(r)}>{fr ? 'Traiter' : 'Review'}</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.title}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              {editing.description && <p className="text-sm text-muted-foreground">{editing.description}</p>}
              {editing.pdf_url ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={editing.pdf_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />{fr ? 'Ouvrir le PDF de l’épreuve' : 'Open paper PDF'}</a>
                </Button>
              ) : <p className="text-xs text-muted-foreground">{fr ? 'Aucun PDF fourni.' : 'No PDF provided.'}</p>}
              <div>
                <Label>{fr ? 'Questions (JSON, même format que les épreuves)' : 'Questions (JSON, same format as papers)'}</Label>
                <Textarea rows={10} className="font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} placeholder='[{"question": "...", "type": "mcq", "options": ["A","B"], "answer": "A", "points": 1}]' />
                <div className="mt-2 flex items-center gap-2">
                  <Input type="file" accept=".json,application/json" className="max-w-xs" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setJson(await f.text()); }} />
                  <Button type="button" size="sm" variant="outline" onClick={() => { if (parseJson().ok) toast.success(fr ? 'JSON valide' : 'Valid JSON'); }}>{fr ? 'Valider le JSON' : 'Validate JSON'}</Button>
                </div>
              </div>
              <div>
                <Label>{fr ? 'Ou identifiant d’une épreuve existante (optionnel)' : 'Or existing paper ID (optional)'}</Label>
                <Input value={examId} onChange={(e) => setExamId(e.target.value)} placeholder="uuid" />
              </div>
              <div>
                <Label>{fr ? 'Note pour l’établissement (obligatoire en cas de refus)' : 'Note to the school (required when rejecting)'}</Label>
                <Input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
              </div>
              {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => save(null)}>{fr ? 'Enregistrer' : 'Save'}</Button>
                <Button variant="destructive" onClick={() => save('rejected')}><XCircle className="mr-2 h-4 w-4" />{fr ? 'Refuser' : 'Reject'}</Button>
                <Button onClick={() => save('approved')}><CheckCircle2 className="mr-2 h-4 w-4" />{fr ? 'Valider' : 'Approve'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
