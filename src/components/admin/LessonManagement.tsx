import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LessonDocumentField from '@/components/admin/LessonDocumentField';
import LessonDocumentViewer from '@/components/lesson/LessonDocumentViewer';
import { resolveLessonDoc } from '@/lib/lessonDocs';
import { BookOpen, Copy, Edit, Eye, FileText, Plus, Search, Trash2 } from 'lucide-react';

interface LessonRow {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  file_url: string | null;
  chapter: string | null;
  class_id: string | null;
  subject_id: string | null;
  series_id: string | null;
  establishment_id: string | null;
  language: string;
  estimated_minutes: number | null;
  order_number: number;
  is_published: boolean;
  is_free: boolean;
  view_count: number;
  created_at: string;
}

interface Option {
  id: string;
  label: string;
}

const emptyForm = {
  id: '',
  title: '',
  summary: '',
  content: '',
  file_url: '',
  chapter: '',
  class_id: '',
  subject_id: '',
  series_id: '',
  language: 'fr',
  minutes: '20',
  is_published: true,
  is_free: false,
};

export default function LessonManagement() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { user } = useAuth();
  const { toast } = useToast();

  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [series, setSeries] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [previewLesson, setPreviewLesson] = useState<LessonRow | null>(null);

  const load = useCallback(async () => {
    const [{ data: ls }, { data: cl }, { data: su }, { data: se }] = await Promise.all([
      supabase
        .from('lessons')
        .select(
          'id, title, summary, content, file_url, chapter, class_id, subject_id, series_id, establishment_id, language, estimated_minutes, order_number, is_published, is_free, view_count, created_at',
        )
        .order('created_at', { ascending: false }),
      supabase.from('classes').select('id, display_name').order('display_name'),
      supabase.from('subjects').select('id, name, name_fr, name_en').eq('is_active', true).order('name'),
      supabase.from('series').select('id, code, name_fr, name_en, name').eq('is_active', true).order('order_number'),
    ]);

    setLessons((ls as LessonRow[]) || []);
    setClasses(((cl as { id: string; display_name: string }[]) || []).map((c) => ({ id: c.id, label: c.display_name })));
    setSubjects(
      ((su as { id: string; name: string; name_fr: string | null; name_en: string | null }[]) || []).map((s) => ({
        id: s.id,
        label: (fr ? s.name_fr : s.name_en) || s.name,
      })),
    );
    setSeries(
      ((se as { id: string; code: string; name: string; name_fr: string | null; name_en: string | null }[]) || []).map((s) => ({
        id: s.id,
        label: `${s.code} — ${(fr ? s.name_fr : s.name_en) || s.name}`,
      })),
    );
    setLoading(false);
  }, [fr]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      lessons.filter((l) => {
        if (classFilter !== 'all' && l.class_id !== classFilter) return false;
        if (subjectFilter !== 'all' && l.subject_id !== subjectFilter) return false;
        if (statusFilter === 'published' && !l.is_published) return false;
        if (statusFilter === 'draft' && l.is_published) return false;
        if (statusFilter === 'document' && !l.file_url) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            l.title.toLowerCase().includes(q) ||
            (l.chapter || '').toLowerCase().includes(q) ||
            (l.summary || '').toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [lessons, classFilter, subjectFilter, statusFilter, search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const labelOf = (list: Option[], id: string | null) => list.find((o) => o.id === id)?.label || '—';

  const openNew = () => {
    setForm({ ...emptyForm, language: fr ? 'fr' : 'en' });
    setOpen(true);
  };

  const openEdit = (l: LessonRow) => {
    setForm({
      id: l.id,
      title: l.title,
      summary: l.summary || '',
      content: l.content || '',
      file_url: l.file_url || '',
      chapter: l.chapter || '',
      class_id: l.class_id || '',
      subject_id: l.subject_id || '',
      series_id: l.series_id || '',
      language: l.language || 'fr',
      minutes: String(l.estimated_minutes ?? 20),
      is_published: l.is_published,
      is_free: l.is_free,
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 3) return;
    setSaving(true);

    const payload = {
      title: form.title.trim().slice(0, 200),
      summary: form.summary.trim().slice(0, 500) || null,
      content: form.content.trim() || null,
      file_url: form.file_url.trim() || null,
      chapter: form.chapter.trim().slice(0, 120) || null,
      class_id: form.class_id || null,
      subject_id: form.subject_id || null,
      series_id: form.series_id || null,
      language: form.language,
      estimated_minutes: Number(form.minutes) || null,
      is_published: form.is_published,
      is_free: form.is_free,
    };

    const { error } = form.id
      ? await supabase.from('lessons').update(payload).eq('id', form.id)
      : await supabase
          .from('lessons')
          .insert({ ...payload, order_number: lessons.length + 1, created_by: user?.id });

    setSaving(false);
    if (error) {
      toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: form.id ? (fr ? 'Leçon mise à jour' : 'Lesson updated') : fr ? 'Leçon créée' : 'Lesson created' });
    setOpen(false);
    load();
  };

  const togglePublish = async (l: LessonRow) => {
    await supabase.from('lessons').update({ is_published: !l.is_published }).eq('id', l.id);
    setLessons((prev) => prev.map((x) => (x.id === l.id ? { ...x, is_published: !x.is_published } : x)));
  };

  const duplicate = async (l: LessonRow) => {
    const { error } = await supabase.from('lessons').insert({
      title: `${l.title} (copie)`.slice(0, 200),
      summary: l.summary,
      content: l.content,
      file_url: l.file_url,
      chapter: l.chapter,
      class_id: l.class_id,
      subject_id: l.subject_id,
      series_id: l.series_id,
      language: l.language,
      estimated_minutes: l.estimated_minutes,
      order_number: lessons.length + 1,
      is_published: false,
      is_free: l.is_free,
      created_by: user?.id,
    });
    if (error) {
      toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) {
      toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setLessons((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" />
          {fr ? 'Leçons' : 'Lessons'} ({filtered.length})
        </CardTitle>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          {fr ? 'Nouvelle leçon' : 'New lesson'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={fr ? 'Rechercher…' : 'Search…'}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select value={subjectFilter} onValueChange={(v) => { setSubjectFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder={fr ? 'Matière' : 'Subject'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{fr ? 'Toutes les matières' : 'All subjects'}</SelectItem>
              {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder={fr ? 'Classe' : 'Class'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{fr ? 'Toutes les classes' : 'All classes'}</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder={fr ? 'Statut' : 'Status'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{fr ? 'Tous' : 'All'}</SelectItem>
              <SelectItem value="published">{fr ? 'Publiées' : 'Published'}</SelectItem>
              <SelectItem value="draft">{fr ? 'Brouillons' : 'Drafts'}</SelectItem>
              <SelectItem value="document">{fr ? 'Avec document' : 'With document'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{fr ? 'Aucune leçon.' : 'No lesson.'}</p>
        ) : (
          <div className="space-y-2">
            {visible.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate flex items-center gap-2">
                    {l.title}
                    {l.file_url && <FileText className="h-3.5 w-3.5 text-secondary shrink-0" />}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {labelOf(subjects, l.subject_id)} · {labelOf(classes, l.class_id)}
                    {l.chapter ? ` · ${l.chapter}` : ''}
                    {l.establishment_id ? ` · ${fr ? 'École' : 'School'}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant={l.is_free ? 'secondary' : 'outline'}>
                    {l.is_free ? (fr ? 'Gratuit' : 'Free') : fr ? 'Abonnés' : 'Subscribers'}
                  </Badge>
                  <Badge
                    variant={l.is_published ? 'secondary' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => togglePublish(l)}
                  >
                    {l.is_published ? (fr ? 'Publiée' : 'Published') : fr ? 'Brouillon' : 'Draft'}
                  </Badge>
                  {l.file_url && (
                    <Button variant="ghost" size="icon" onClick={() => setPreviewLesson(l)} title={fr ? 'Aperçu' : 'Preview'}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => openEdit(l)} title={fr ? 'Modifier' : 'Edit'}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => duplicate(l)} title={fr ? 'Dupliquer' : 'Duplicate'}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(l.id)} title={fr ? 'Supprimer' : 'Delete'}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              {fr ? 'Précédent' : 'Previous'}
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              {fr ? 'Suivant' : 'Next'}
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? (fr ? 'Modifier la leçon' : 'Edit lesson') : fr ? 'Nouvelle leçon' : 'New lesson'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label htmlFor="al-title">{fr ? 'Titre' : 'Title'}</Label>
              <Input id="al-title" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <LessonDocumentField value={form.file_url} onChange={(v) => setForm({ ...form, file_url: v })} />

            <div>
              <Label htmlFor="al-summary">{fr ? 'Résumé' : 'Summary'}</Label>
              <Textarea id="al-summary" maxLength={500} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{fr ? 'Matière' : 'Subject'}</Label>
                <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                  <SelectTrigger><SelectValue placeholder={fr ? 'Choisir' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{fr ? 'Classe' : 'Class'}</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder={fr ? 'Choisir' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{fr ? 'Série' : 'Series'}</Label>
                <Select value={form.series_id} onValueChange={(v) => setForm({ ...form, series_id: v })}>
                  <SelectTrigger><SelectValue placeholder={fr ? 'Optionnel' : 'Optional'} /></SelectTrigger>
                  <SelectContent>
                    {series.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="al-chapter">{fr ? 'Chapitre' : 'Chapter'}</Label>
                <Input id="al-chapter" maxLength={120} value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="al-min">{fr ? 'Durée (min)' : 'Duration (min)'}</Label>
                <Input id="al-min" type="number" min={1} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} />
              </div>
              <div>
                <Label>{fr ? 'Langue' : 'Language'}</Label>
                <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <details className="rounded-lg border p-3">
              <summary className="text-sm font-medium cursor-pointer">{fr ? 'Contenu texte (optionnel)' : 'Text content (optional)'}</summary>
              <Textarea
                className="mt-3"
                rows={6}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={fr ? 'Utilisé si aucun document n’est fourni.' : 'Used when no document link is provided.'}
              />
            </details>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="al-free">{fr ? 'Leçon gratuite' : 'Free lesson'}</Label>
                <Switch id="al-free" checked={form.is_free} onCheckedChange={(v) => setForm({ ...form, is_free: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="al-pub">{fr ? 'Publier' : 'Publish'}</Label>
                <Switch id="al-pub" checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{fr ? 'Annuler' : 'Cancel'}</Button>
              <Button type="submit" disabled={saving}>{fr ? 'Enregistrer' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewLesson} onOpenChange={(v) => !v && setPreviewLesson(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{previewLesson?.title}</DialogTitle></DialogHeader>
          {previewLesson?.file_url && (
            <LessonDocumentViewer
              fileUrl={previewLesson.file_url}
              embedUrl={resolveLessonDoc(previewLesson.file_url)?.embedUrl}
              title={previewLesson.title}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
