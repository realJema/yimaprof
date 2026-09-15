import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SeoHead from '@/components/SeoHead';
import LessonDocumentField from '@/components/admin/LessonDocumentField';
import LessonJsonImport from '@/components/admin/LessonJsonImport';
import { parseLessonQuestions } from '@/lib/lessonQuestions';
import {
  LessonExercises,
  emptyLessonExercises,
  parseLessonExercises,
} from '@/lib/lessonJsonExercises';
import { ArrowLeft, BookOpen, Shield } from 'lucide-react';

interface Option {
  id: string;
  label: string;
}

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
  language: string;
  estimated_minutes: number | null;
  order_number: number;
  is_published: boolean;
  is_free: boolean;
  questions?: unknown;
  exercises?: unknown;
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
  questions: [] as ReturnType<typeof parseLessonQuestions>,
  exercises: emptyLessonExercises() as LessonExercises,
};

export default function LessonEditor() {
  const { lessonId } = useParams<{ lessonId?: string }>();
  const isEdit = Boolean(lessonId);
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [series, setSeries] = useState<Option[]>([]);
  const [form, setForm] = useState({ ...emptyForm });

  const checkAccess = useCallback(async () => {
    if (!user) {
      setHasAccess(false);
      setChecking(false);
      return;
    }
    try {
      const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id });
      if (isAdmin === true) {
        setHasAccess(true);
        return;
      }
      const { data: isEditor } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'editor' });
      setHasAccess(isEditor === true);
    } catch {
      setHasAccess(false);
    } finally {
      setChecking(false);
    }
  }, [user]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  const loadReferenceData = useCallback(async () => {
    const [{ data: cl }, { data: su }, { data: se }] = await Promise.all([
      supabase.from('classes').select('id, display_name').order('display_name'),
      supabase.from('subjects').select('id, name, name_fr, name_en').eq('is_active', true).order('name'),
      supabase.from('series').select('id, code, name_fr, name_en, name').eq('is_active', true).order('order_number'),
    ]);
    setClasses(((cl as { id: string; display_name: string }[]) || []).map((c) => ({ id: c.id, label: c.display_name })));
    setSubjects(
      ((su as { id: string; name: string; name_fr: string | null; name_en: string | null }[]) || []).map((s) => ({
        id: s.id,
        label: (fr ? s.name_fr : s.name_en) || s.name,
      })),
    );
    setSeries(
      ((se as { id: string; code: string; name: string; name_fr: string | null; name_en: string | null }[]) || []).map(
        (s) => ({
          id: s.id,
          label: `${s.code} — ${(fr ? s.name_fr : s.name_en) || s.name}`,
        }),
      ),
    );
  }, [fr]);

  const loadLesson = useCallback(async () => {
    if (!lessonId) return;
    const { data } = await supabase.from('lessons').select('*').eq('id', lessonId).maybeSingle();
    const l = data as LessonRow | null;
    if (!l) {
      toast({ title: fr ? 'Leçon introuvable' : 'Lesson not found', variant: 'destructive' });
      navigate('/admin/lessons');
      return;
    }
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
      questions: parseLessonQuestions(l.questions),
      exercises: parseLessonExercises(l.exercises),
    });
    setLoading(false);
  }, [lessonId, fr, toast, navigate]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    if (isEdit && !checking && hasAccess) {
      loadLesson();
    }
  }, [isEdit, checking, hasAccess, loadLesson]);

  const title = useMemo(
    () => (isEdit ? (fr ? 'Modifier la leçon' : 'Edit lesson') : fr ? 'Nouvelle leçon' : 'New lesson'),
    [isEdit, fr],
  );

  const save = async (e: React.FormEvent, viewAfter = false) => {
    e.preventDefault();
    if (form.title.trim().length < 3) {
      setStep(1);
      toast({
        title: fr ? 'Titre requis' : 'Title required',
        description: fr ? 'Le titre doit contenir au moins 3 caractères.' : 'The title needs at least 3 characters.',
        variant: 'destructive',
      });
      return;
    }
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
      questions: form.questions.filter((q) => q.prompt.trim().length > 0),
      exercises: form.exercises,
    };

    let resultId = form.id;
    if (form.id) {
      const { error } = await supabase.from('lessons').update(payload as never).eq('id', form.id);
      if (error) {
        setSaving(false);
        toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      const { count } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
      const { data, error } = await supabase
        .from('lessons')
        .insert({ ...payload, order_number: (count ?? 0) + 1, created_by: user?.id } as never)
        .select('id')
        .maybeSingle();
      if (error) {
        setSaving(false);
        toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      resultId = (data as { id: string } | null)?.id || '';
    }

    setSaving(false);
    toast({ title: form.id ? (fr ? 'Leçon mise à jour' : 'Lesson updated') : fr ? 'Leçon créée' : 'Lesson created' });

    if (viewAfter && resultId) {
      navigate(`/lessons/${resultId}`);
    } else {
      navigate('/admin/lessons');
    }
  };

  if (authLoading || checking) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <Shield className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-medium">{fr ? 'Accès réservé aux administrateurs.' : 'Administrators only.'}</p>
            <Button asChild variant="outline">
              <Link to="/">{fr ? 'Retour à l’accueil' : 'Back home'}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SeoHead
        title={`${title} | Yimaprof`}
        description={fr ? 'Créer ou modifier une leçon.' : 'Create or edit a lesson.'}
        path={isEdit ? `/admin/lesson/edit/${lessonId}` : '/admin/lesson/new'}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-secondary" />
          {title}
        </h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/lessons">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {fr ? 'Retour à la liste' : 'Back to list'}
          </Link>
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card>
          <CardContent className="py-6">
            <form onSubmit={(e) => save(e)} className="space-y-6">
              <div className="flex items-center gap-2">
                {[
                  { n: 1, label: fr ? 'Informations générales' : 'General information' },
                  { n: 2, label: fr ? 'Contenu du cours' : 'Course content' },
                  { n: 3, label: fr ? 'Exercices d’application' : 'Practice exercises' },
                ].map((s) => (
                  <button
                    key={s.n}
                    type="button"
                    onClick={() => setStep(s.n)}
                    className={`flex-1 rounded-lg border p-3 text-xs transition-colors text-left ${
                      step === s.n ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted/50'
                    }`}
                  >
                    <span className="block font-semibold">{s.n}</span>
                    {s.label}
                  </button>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="le-title">{fr ? 'Titre' : 'Title'}</Label>
                    <Input
                      id="le-title"
                      maxLength={200}
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="le-summary">{fr ? 'Résumé' : 'Summary'}</Label>
                    <Textarea
                      id="le-summary"
                      maxLength={500}
                      value={form.summary}
                      onChange={(e) => setForm({ ...form, summary: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>{fr ? 'Matière' : 'Subject'}</Label>
                      <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder={fr ? 'Choisir' : 'Select'} />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{fr ? 'Classe' : 'Class'}</Label>
                      <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder={fr ? 'Choisir' : 'Select'} />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{fr ? 'Série' : 'Series'}</Label>
                      <Select value={form.series_id} onValueChange={(v) => setForm({ ...form, series_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder={fr ? 'Optionnel' : 'Optional'} />
                        </SelectTrigger>
                        <SelectContent>
                          {series.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="le-chapter">{fr ? 'Chapitre' : 'Chapter'}</Label>
                      <Input
                        id="le-chapter"
                        maxLength={120}
                        value={form.chapter}
                        onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="le-min">{fr ? 'Durée (min)' : 'Duration (min)'}</Label>
                      <Input
                        id="le-min"
                        type="number"
                        min={1}
                        value={form.minutes}
                        onChange={(e) => setForm({ ...form, minutes: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {fr
                          ? 'Sert aussi de base au minuteur de l’évaluation côté élève.'
                          : 'Also used as the countdown base for the student evaluation.'}
                      </p>
                    </div>
                    <div>
                      <Label>{fr ? 'Langue' : 'Language'}</Label>
                      <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <Label htmlFor="le-free">{fr ? 'Leçon gratuite' : 'Free lesson'}</Label>
                      <Switch
                        id="le-free"
                        checked={form.is_free}
                        onCheckedChange={(v) => setForm({ ...form, is_free: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <Label htmlFor="le-pub">{fr ? 'Publier' : 'Publish'}</Label>
                      <Switch
                        id="le-pub"
                        checked={form.is_published}
                        onCheckedChange={(v) => setForm({ ...form, is_published: v })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <LessonDocumentField value={form.file_url} onChange={(v) => setForm({ ...form, file_url: v })} />
                  <details className="rounded-lg border p-3">
                    <summary className="text-sm font-medium cursor-pointer">
                      {fr ? 'Contenu texte (optionnel)' : 'Text content (optional)'}
                    </summary>
                    <Textarea
                      className="mt-3"
                      rows={6}
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      placeholder={fr ? 'Utilisé si aucun document n’est fourni.' : 'Used when no document link is provided.'}
                    />
                  </details>
                </div>
              )}

              {step === 3 && (
                <LessonJsonImport
                  value={form.exercises}
                  onChange={(exercises) => setForm({ ...form, exercises })}
                />
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
                  {fr ? 'Précédent' : 'Previous'}
                </Button>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" asChild>
                    <Link to="/admin/lessons">{fr ? 'Annuler' : 'Cancel'}</Link>
                  </Button>
                  {step < 3 ? (
                    <Button type="button" onClick={() => setStep((s) => s + 1)}>
                      {fr ? 'Suivant' : 'Next'}
                    </Button>
                  ) : (
                    <>
                      <Button type="submit" variant="outline" disabled={saving}>
                        {fr ? 'Enregistrer' : 'Save'}
                      </Button>
                      <Button type="button" disabled={saving} onClick={(e) => save(e, true)}>
                        {fr ? 'Publier — voir côté élève' : 'Publish — view as student'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
