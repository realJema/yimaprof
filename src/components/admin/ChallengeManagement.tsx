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
import { CheckCircle2, ExternalLink, FileJson, Trophy, XCircle, Plus, Trash2, Power } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import ChallengeDetailsForm, { type ChallengeFields } from '@/components/challenge/ChallengeDetailsForm';
import { parseChallengeQuestions } from '@/lib/challengeQuestions';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';

interface Row extends ChallengeFields {
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
  status: string;
}

const hasQuestions = (q: unknown) =>
  Array.isArray(q) ? q.length > 0 : !!q && typeof q === 'object' && Object.keys(q as object).length > 0;

export function ChallengeManagement() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const fr = language !== 'en';
  const [rows, setRows] = useState<Row[]>([]);
  const [series, setSeries] = useState<{ id: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [classes, setClasses] = useState<{id: string; display_name: string}[]>([]);
  const [subjects, setSubjects] = useState<{id: string; name: string}[]>([]);
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
        .select('*, establishments(name)')
        .order('created_at', { ascending: false }),
      supabase.from('series').select('id, code').order('order_number'),
    ]);
    setRows((data as unknown as Row[]) || []);
    setSeries(se || []);
    const [{ data: cl }, { data: su }] = await Promise.all([supabase.from('classes').select('id, display_name').order('display_name'), supabase.from('subjects').select('id, name, name_fr, name_en').eq('is_active', true).order('name')]);
    setClasses(cl || []); setSubjects((su || []).map((o) => ({ id: o.id, name: (fr ? o.name_fr : o.name_en) || o.name })));
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
    setEditing({ ...r, starts_at: r.starts_at || new Date(Math.min(Date.now(), new Date(r.ends_at).getTime() - 86400000)).toISOString() });
    setJson(hasQuestions(r.questions) ? JSON.stringify(r.questions, null, 2) : '');
    setExamId(r.exam_id || '');
    setNote(r.review_note || '');
    setJsonError(null);
  };

  const parseJson = (): { ok: boolean; value: unknown } => {
    if (!json.trim()) return { ok: true, value: [] };
    try {
      const v = parseChallengeQuestions(JSON.parse(json));
      if (!hasQuestions(v)) throw new Error(fr ? 'Le JSON ne contient aucune question.' : 'The JSON contains no question.');
      setJsonError(null);
      return { ok: true, value: v };
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : String(e));
      return { ok: false, value: null };
    }
  };

  const save = async (review: 'approved' | 'rejected' | null) => {
    if (!editing || saving || uploading) return;
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
    if (editing.title.trim().length < 3 || !editing.starts_at || !editing.ends_at || new Date(editing.ends_at) <= new Date(editing.starts_at)) {
      setJsonError(fr ? 'Titre et dates valides requis (fin après début).' : 'A valid title and dates are required (end after start).'); return;
    }
    if (!Number.isFinite(editing.duration_minutes) || editing.duration_minutes < 5 || editing.duration_minutes > 600 || !Number.isInteger(editing.graded_out_of) || editing.graded_out_of < 1 || editing.graded_out_of > 100) { setJsonError(fr ? 'Vérifiez la durée (5–600 min) et le barème (1–100).' : 'Check duration (5–600 min) and grading scale (1–100).'); return; }
    if (editing.pdf_url && !editing.pdf_url.startsWith('storage:') && !/^https:\/\/(drive|docs)\.google\.com\//.test(editing.pdf_url)) { setJsonError(fr ? 'Lien Google Drive invalide.' : 'Invalid Google Drive link.'); return; }
    if (trimmedExam) {
      const { data: linked, error: linkedError } = await supabase.from('exams').select('id').eq('id', trimmedExam).maybeSingle();
      if (linkedError || !linked) { setJsonError(fr ? 'Épreuve introuvable.' : 'Paper not found.'); return; }
    }
    const patch: Record<string, unknown> = {
      title: editing.title.trim().slice(0,150), description: editing.description?.trim().slice(0,500) || null,
      starts_at: new Date(editing.starts_at).toISOString(), ends_at: new Date(editing.ends_at).toISOString(),
      duration_minutes: editing.duration_minutes, graded_out_of: editing.graded_out_of,
      scope: editing.scope, region: editing.region || null, country: editing.country || null, reward: editing.reward || null,
      subject_id: editing.subject_id || null, class_id: editing.class_id || null, eligible_class_ids: editing.eligible_class_ids || [],
      eligible_series_ids: editing.eligible_series_ids || [], pdf_url: editing.pdf_url || null,

      questions: parsed.value,
      exam_id: trimmedExam || null,
      review_note: note.trim().slice(0, 500) || null,
    };
    if (review) {
      patch.review_status = review;
      patch.status = review === 'approved' ? 'active' : 'draft';
    }
    setSaving(true);
    const { error } = editing.id ? await supabase.from('challenges').update(patch as never).eq('id', editing.id) : await supabase.from('challenges').insert({ ...patch, created_by: user?.id, status: review === 'approved' ? 'active' : 'draft', review_status: review || 'pending' } as never);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(review === 'approved' ? (fr ? 'Challenge validé' : 'Challenge approved') : review === 'rejected' ? (fr ? 'Challenge refusé' : 'Challenge rejected') : (fr ? 'Enregistré' : 'Saved'));
    setEditing(null);
    load();
  };

  const createNew = () => {
    open({ id: '', title: '', description: '', starts_at: new Date().toISOString(), ends_at: new Date(Date.now()+14*86400000).toISOString(), duration_minutes: 60, graded_out_of: 20, status: 'draft', review_status: 'pending', review_note: null, pdf_url: null, exam_id: null, questions: [], eligible_series_ids: [], eligible_class_ids: [], establishment_id: null, establishments: null, created_at: new Date().toISOString(), scope: 'national', region: null, country: 'Cameroun', reward: null, subject_id: null, class_id: null });
  };
  const toggle = async (row: Row) => {
    if (saving || row.review_status !== 'approved') return;
    setSaving(true);
    const { error } = await supabase.from('challenges').update({ status: row.status === 'active' ? 'draft' : 'active' }).eq('id',row.id);
    setSaving(false);
    if (error) toast.error(error.message); else load();
  };
  const remove = async () => {
    if (!deleting || saving) return;
    setSaving(true);
    const { error } = await supabase.from('challenges').delete().eq('id',deleting.id);
    setSaving(false);
    if (error) { toast.error(fr ? 'Suppression impossible : ce challenge peut avoir des participations. Désactivez-le pour conserver les résultats.' : 'Unable to delete: this challenge may have attempts. Deactivate it to preserve results.'); return; }
    setDeleting(null); load();
  };
  const label = (s: string) => s === 'approved' ? (fr ? 'Validé' : 'Approved') : s === 'rejected' ? (fr ? 'Refusé' : 'Rejected') : (fr ? 'En attente' : 'Pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-secondary" />{fr ? 'Gestion des challenges' : 'Challenge management'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button onClick={createNew}><Plus className="mr-2 h-4 w-4" />{fr ? "Créer challenge" : "Create challenge"}</Button>
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
                <div className="flex flex-wrap items-center gap-2">
                  {(hasQuestions(r.questions) || r.exam_id) && <Badge variant="outline"><FileJson className="mr-1 h-3 w-3" />{fr ? 'Questions prêtes' : 'Questions ready'}</Badge>}
                  <Badge variant={r.review_status === 'rejected' ? 'destructive' : r.review_status === 'approved' ? 'secondary' : 'outline'}>{label(r.review_status)}</Badge>
                  <Badge variant="outline">{r.status === "active" ? (fr ? "Actif" : "Active") : (fr ? "Inactif" : "Inactive")}</Badge>
                  <Button size="icon" variant="ghost" disabled={saving || r.review_status !== "approved"} title={r.status === "active" ? (fr ? "Désactiver" : "Deactivate") : (fr ? "Activer" : "Activate")} onClick={() => toggle(r)}><Power className={r.status === "active" ? "h-4 w-4 text-accent" : "h-4 w-4 text-muted-foreground"} /></Button>
                  <Button size="icon" variant="ghost" title={fr ? "Supprimer" : "Delete"} onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  <Button size="sm" variant="outline" onClick={() => open(r)}>{fr ? 'Traiter' : 'Review'}</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? (fr ? "Modifier / traiter le challenge" : "Edit / review challenge") : (fr ? "Créer challenge" : "Create challenge")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <ChallengeDetailsForm value={editing} onChange={(patch) => setEditing({ ...editing, ...patch })} series={series} classes={classes} subjects={subjects} onBusyChange={setUploading} />
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
                <Button disabled={saving || uploading} variant="outline" onClick={() => save(null)}>{fr ? 'Enregistrer' : 'Save'}</Button>
                <Button disabled={saving || uploading || !editing.id} variant="destructive" onClick={() => save('rejected')}><XCircle className="mr-2 h-4 w-4" />{fr ? 'Refuser' : 'Reject'}</Button>
                <Button disabled={saving || uploading} onClick={() => save('approved')}><CheckCircle2 className="mr-2 h-4 w-4" />{fr ? 'Valider' : 'Approve'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{fr ? 'Supprimer ce challenge ?' : 'Delete this challenge?'}</AlertDialogTitle><AlertDialogDescription>{fr ? 'Cette action est définitive. Si des résultats existent, préférez la désactivation.' : 'This cannot be undone. Prefer deactivation when results already exist.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{fr ? 'Annuler' : 'Cancel'}</AlertDialogCancel><Button variant="destructive" disabled={saving} onClick={remove}>{fr ? 'Supprimer' : 'Delete'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </Card>
  );
}
