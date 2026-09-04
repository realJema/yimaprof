import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import LessonDocumentField from '@/components/admin/LessonDocumentField';
import { BookOpen, Eye, FileText, Plus, Trash2 } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  summary: string | null;
  chapter: string | null;
  is_published: boolean;
  view_count: number;
  class_id: string | null;
  subject_id: string | null;
  created_at: string;
}

interface Option { id: string; label: string }

export default function SchoolContent({ establishmentId }: { establishmentId: string }) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { user } = useAuth();
  const { toast } = useToast();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', summary: '', content: '', file_url: '', chapter: '', class_id: '', subject_id: '', minutes: '15', is_published: true });

  const load = async () => {
    const [{ data: ls }, { data: cl }, { data: su }] = await Promise.all([
      supabase
        .from('lessons')
        .select('id, title, summary, chapter, is_published, view_count, class_id, subject_id, created_at')
        .eq('establishment_id', establishmentId)
        .order('created_at', { ascending: false }),
      supabase.from('establishment_classes').select('classes(id, display_name)').eq('establishment_id', establishmentId),
      supabase.from('subjects').select('id, name').eq('is_active', true).order('name'),
    ]);
    setLessons((ls as Lesson[]) || []);
    setClasses(
      (((cl as unknown as { classes: { id: string; display_name: string } | null }[]) || [])
        .map((r) => r.classes)
        .filter(Boolean) as { id: string; display_name: string }[]).map((c) => ({ id: c.id, label: c.display_name })),
    );
    setSubjects((((su as { id: string; name: string }[]) || []).map((s) => ({ id: s.id, label: s.name }))));
    setLoading(false);
  };

  useEffect(() => { load(); }, [establishmentId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 3) return;
    setSaving(true);
    const { error } = await supabase.from('lessons').insert({
      establishment_id: establishmentId,
      title: form.title.trim().slice(0, 200),
      summary: form.summary.trim().slice(0, 500) || null,
      content: form.content.trim() || null,
      chapter: form.chapter.trim().slice(0, 120) || null,
      class_id: form.class_id || null,
      subject_id: form.subject_id || null,
      estimated_minutes: Number(form.minutes) || null,
      order_number: lessons.length + 1,
      language: fr ? 'fr' : 'en',
      is_published: form.is_published,
      is_free: true,
      created_by: user?.id,
    });
    setSaving(false);
    if (error) {
      toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: fr ? 'Contenu ajouté' : 'Content added' });
    setOpen(false);
    setForm({ title: '', summary: '', content: '', chapter: '', class_id: '', subject_id: '', minutes: '15', is_published: true });
    load();
  };

  const togglePublish = async (lesson: Lesson) => {
    await supabase.from('lessons').update({ is_published: !lesson.is_published }).eq('id', lesson.id);
    setLessons((prev) => prev.map((l) => (l.id === lesson.id ? { ...l, is_published: !l.is_published } : l)));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) {
      toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setLessons((prev) => prev.filter((l) => l.id !== id));
  };

  const labelOf = (list: Option[], id: string | null) => list.find((o) => o.id === id)?.label || '—';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" />
          {fr ? 'Contenus pédagogiques' : 'Learning content'} ({lessons.length})
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />{fr ? 'Ajouter un contenu' : 'Add content'}</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{fr ? 'Nouveau contenu' : 'New content'}</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div>
                <Label htmlFor="lt">{fr ? 'Titre' : 'Title'}</Label>
                <Input id="lt" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="ls">{fr ? 'Résumé' : 'Summary'}</Label>
                <Textarea id="ls" maxLength={500} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
              </div>
              <LessonDocumentField value={form.file_url} onChange={(v) => setForm({ ...form, file_url: v })} id="school-lesson-doc" />
              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {fr ? 'Contenu texte (optionnel)' : 'Text content (optional)'}
                </summary>
                <Textarea
                  id="lc"
                  rows={6}
                  className="mt-3"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
              </details>

              <div className="grid gap-4 sm:grid-cols-2">
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
                  <Label>{fr ? 'Matière' : 'Subject'}</Label>
                  <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                    <SelectTrigger><SelectValue placeholder={fr ? 'Choisir' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="lch">{fr ? 'Chapitre' : 'Chapter'}</Label>
                  <Input id="lch" maxLength={120} value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="lm">{fr ? 'Durée (min)' : 'Duration (min)'}</Label>
                  <Input id="lm" type="number" min={1} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="lp">{fr ? 'Publier immédiatement' : 'Publish immediately'}</Label>
                <Switch id="lp" checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{fr ? 'Annuler' : 'Cancel'}</Button>
                <Button type="submit" disabled={saving}>{fr ? 'Enregistrer' : 'Save'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">{fr ? 'Aucun contenu pour le moment.' : 'No content yet.'}</p>
        ) : (
          lessons.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{l.title}</p>
                <p className="text-xs text-muted-foreground">
                  {labelOf(subjects, l.subject_id)} · {labelOf(classes, l.class_id)}{l.chapter ? ` · ${l.chapter}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="h-3 w-3" />{l.view_count}</span>
                <Badge variant={l.is_published ? 'secondary' : 'outline'} className="cursor-pointer" onClick={() => togglePublish(l)}>
                  {l.is_published ? (fr ? 'Publié' : 'Published') : fr ? 'Brouillon' : 'Draft'}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => remove(l.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}