import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EditableExamContentRenderer } from '@/components/exam/EditableExamContentRenderer';
import {
  ExerciseItem,
  LESSON_EXAM_VISIBILITY,
  LESSON_LEVELS,
  LessonLevel,
  countQuestions,
  levelLabel,
  newLongFormItem,
  newMcqItem,
  newTextItem,
  normalizeLevel,
  parseExerciseContent,
  totalMarks,
} from '@/lib/lessonExercises';
import { ArrowDown, ArrowUp, Edit, FileText, Link2, ListChecks, Plus, Search, Trash2 } from 'lucide-react';

export interface LessonLite {
  id: string;
  title: string;
  subject_id: string | null;
  class_id: string | null;
  series_id: string | null;
  language: string;
}

interface ExerciseRow {
  id: string;
  exam_id: string;
  level: string;
  title: string | null;
  order_number: number;
  origin: string;
  exams: { id: string; title: string; content: unknown; visibility: string | null } | null;
}

interface Defaults {
  subjectId: string;
  examTypeId: string;
  periodId: string;
  academicYearId: string;
  durationId: string;
}

interface LibraryExam {
  id: string;
  title: string;
  subjects: { name_fr: string | null; name_en: string | null } | null;
  classes: { display_name: string } | null;
}

/**
 * Lesson-side builder: three difficulty buckets, each holding exercises created
 * inside the lesson and existing exams linked to it. Existing exams are never
 * modified — only referenced.
 */
export default function LessonExerciseManager({ lesson, onClose }: { lesson: LessonLite | null; onClose: () => void }) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { user } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [tab, setTab] = useState<LessonLevel>('easy');

  // Exercise editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ExerciseRow | null>(null);
  const [exTitle, setExTitle] = useState('');
  const [exLevel, setExLevel] = useState<LessonLevel>('easy');
  const [items, setItems] = useState<ExerciseItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Link existing exam
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkLevel, setLinkLevel] = useState<LessonLevel>('easy');
  const [linkSearch, setLinkSearch] = useState('');
  const [libraryExams, setLibraryExams] = useState<LibraryExam[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    if (!lesson) return;
    setLoading(true);
    const [{ data: ex }, { data: types }, { data: periods }, { data: years }, { data: durations }, { data: subjects }] =
      await Promise.all([
        supabase
          .from('lesson_exercises')
          .select('id, exam_id, level, title, order_number, origin, exams(id, title, content, visibility)')
          .eq('lesson_id', lesson.id)
          .order('order_number'),
        supabase.from('exam_types').select('id').eq('is_active', true).limit(1),
        supabase.from('periods').select('id').eq('is_active', true).order('order_number').limit(1),
        supabase.from('academic_years').select('id').order('start_year', { ascending: false }).limit(1),
        supabase.from('durations').select('id').eq('is_active', true).order('minutes').limit(1),
        supabase.from('subjects').select('id').eq('is_active', true).limit(1),
      ]);

    setRows((ex as unknown as ExerciseRow[]) || []);
    setDefaults({
      subjectId: lesson.subject_id || subjects?.[0]?.id || '',
      examTypeId: types?.[0]?.id || '',
      periodId: periods?.[0]?.id || '',
      academicYearId: years?.[0]?.id || '',
      durationId: durations?.[0]?.id || '',
    });
    setLoading(false);
  }, [lesson]);

  useEffect(() => {
    if (lesson) load();
  }, [lesson, load]);

  const byLevel = useMemo(() => {
    const map: Record<LessonLevel, ExerciseRow[]> = { easy: [], intermediate: [], difficult: [] };
    rows.forEach((r) => map[normalizeLevel(r.level)].push(r));
    LESSON_LEVELS.forEach((l) => map[l].sort((a, b) => a.order_number - b.order_number));
    return map;
  }, [rows]);

  /* ---------------------------- exercise editor ---------------------------- */

  const openCreate = (level: LessonLevel) => {
    setEditingRow(null);
    setExLevel(level);
    setExTitle('');
    setItems([newMcqItem(1)]);
    setEditorOpen(true);
  };

  const openEdit = (row: ExerciseRow) => {
    setEditingRow(row);
    setExLevel(normalizeLevel(row.level));
    setExTitle(row.title || row.exams?.title || '');
    setItems(parseExerciseContent(row.exams?.content));
    setEditorOpen(true);
  };

  const addItem = (kind: 'mcq' | 'long' | 'heading' | 'instruction' | 'passage') => {
    const order = items.length + 1;
    setItems((prev) => [
      ...prev,
      kind === 'mcq'
        ? newMcqItem(order)
        : kind === 'long'
          ? newLongFormItem(order)
          : newTextItem(order, kind),
    ]);
  };

  const saveExercise = async () => {
    if (!lesson || !defaults) return;
    if (exTitle.trim().length < 3) {
      toast({ title: fr ? 'Titre trop court' : 'Title too short', variant: 'destructive' });
      return;
    }
    if (countQuestions(items) === 0) {
      toast({ title: fr ? 'Ajoutez au moins une question' : 'Add at least one question', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const content = items.map((item, index) => ({ ...item, order: index + 1 }));

    try {
      if (editingRow && editingRow.origin === 'lesson') {
        const { error: examError } = await supabase
          .from('exams')
          .update({ title: exTitle.trim().slice(0, 200), content } as never)
          .eq('id', editingRow.exam_id);
        if (examError) throw examError;
        const { error: linkError } = await supabase
          .from('lesson_exercises')
          .update({ title: exTitle.trim().slice(0, 200), level: exLevel } as never)
          .eq('id', editingRow.id);
        if (linkError) throw linkError;
      } else {
        const { data: created, error: examError } = await supabase
          .from('exams')
          .insert({
            title: exTitle.trim().slice(0, 200),
            description: `${fr ? 'Exercice de la leçon' : 'Lesson exercise'} — ${lesson.title}`.slice(0, 300),
            content,
            subject_id: defaults.subjectId,
            exam_type_id: defaults.examTypeId,
            period_id: defaults.periodId,
            academic_year_id: defaults.academicYearId,
            duration_id: defaults.durationId,
            class_id: lesson.class_id,
            series_id: lesson.series_id,
            language: lesson.language || 'fr',
            is_published: true,
            visibility: LESSON_EXAM_VISIBILITY,
            created_by: user?.id,
          } as never)
          .select('id')
          .single();
        if (examError) throw examError;

        const { error: linkError } = await supabase.from('lesson_exercises').insert({
          lesson_id: lesson.id,
          exam_id: (created as { id: string }).id,
          level: exLevel,
          title: exTitle.trim().slice(0, 200),
          origin: 'lesson',
          order_number: byLevel[exLevel].length + 1,
        } as never);
        if (linkError) throw linkError;
      }
      toast({ title: fr ? 'Exercice enregistré' : 'Exercise saved' });
      setEditorOpen(false);
      load();
    } catch (error) {
      toast({
        title: fr ? 'Erreur' : 'Error',
        description: (error as { message?: string })?.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------ link an exam ----------------------------- */

  const openLink = (level: LessonLevel) => {
    setLinkLevel(level);
    setLinkSearch('');
    setLibraryExams([]);
    setLinkOpen(true);
  };

  const searchExams = useCallback(async (term: string) => {
    setSearching(true);
    let query = supabase
      .from('exams')
      .select('id, title, subjects:subject_id(name_fr, name_en), classes(display_name)')
      .eq('is_published', true)
      .in('visibility', ['public', 'free'])
      .order('created_at', { ascending: false })
      .limit(25);
    if (term.trim()) query = query.ilike('title', `%${term.trim()}%`);
    const { data } = await query;
    setLibraryExams((data as unknown as LibraryExam[]) || []);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (!linkOpen) return;
    const timer = window.setTimeout(() => searchExams(linkSearch), 300);
    return () => window.clearTimeout(timer);
  }, [linkOpen, linkSearch, searchExams]);

  const linkExam = async (exam: LibraryExam) => {
    if (!lesson) return;
    if (rows.some((r) => r.exam_id === exam.id)) {
      toast({ title: fr ? 'Déjà ajoutée à cette leçon' : 'Already added to this lesson' });
      return;
    }
    const { error } = await supabase.from('lesson_exercises').insert({
      lesson_id: lesson.id,
      exam_id: exam.id,
      level: linkLevel,
      title: exam.title,
      origin: 'linked',
      order_number: byLevel[linkLevel].length + 1,
    } as never);
    if (error) {
      toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: fr ? 'Épreuve liée à la leçon' : 'Paper linked to the lesson' });
    setLinkOpen(false);
    load();
  };

  /* -------------------------------- row tools ------------------------------ */

  const removeRow = async (row: ExerciseRow) => {
    const { error } = await supabase.from('lesson_exercises').delete().eq('id', row.id);
    if (error) {
      toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    // Exercises created inside the lesson are owned by it: clean up the exam too.
    if (row.origin === 'lesson') {
      await supabase.from('exams').delete().eq('id', row.exam_id);
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const move = async (row: ExerciseRow, direction: -1 | 1) => {
    const level = normalizeLevel(row.level);
    const list = byLevel[level];
    const index = list.findIndex((r) => r.id === row.id);
    const target = list[index + direction];
    if (!target) return;
    await Promise.all([
      supabase.from('lesson_exercises').update({ order_number: target.order_number }).eq('id', row.id),
      supabase.from('lesson_exercises').update({ order_number: row.order_number }).eq('id', target.id),
    ]);
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, order_number: target.order_number }
          : r.id === target.id
            ? { ...r, order_number: row.order_number }
            : r,
      ),
    );
  };

  return (
    <>
      <Dialog open={!!lesson} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-secondary" />
              {fr ? 'Exercices de la leçon' : 'Lesson exercises'} — {lesson?.title}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as LessonLevel)}>
              <TabsList className="grid w-full grid-cols-3">
                {LESSON_LEVELS.map((level) => (
                  <TabsTrigger key={level} value={level}>
                    {levelLabel(level, fr)} ({byLevel[level].length})
                  </TabsTrigger>
                ))}
              </TabsList>

              {LESSON_LEVELS.map((level) => (
                <TabsContent key={level} value={level} className="space-y-3 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => openCreate(level)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {fr ? 'Créer un exercice' : 'Create an exercise'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openLink(level)}>
                      <Link2 className="h-4 w-4 mr-2" />
                      {fr ? 'Lier une épreuve' : 'Link a paper'}
                    </Button>
                  </div>

                  {byLevel[level].length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {fr ? 'Aucun exercice dans ce niveau.' : 'No exercise at this level yet.'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {byLevel[level].map((row, index) => (
                        <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{row.title || row.exams?.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.origin === 'lesson'
                                ? fr ? 'Exercice de la leçon' : 'Lesson exercise'
                                : fr ? 'Épreuve liée' : 'Linked paper'}
                              {' · '}
                              {countQuestions(parseExerciseContent(row.exams?.content))}{' '}
                              {fr ? 'questions' : 'questions'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant={row.origin === 'lesson' ? 'secondary' : 'outline'}>
                              {row.origin === 'lesson' ? <ListChecks className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={index === 0}
                              onClick={() => move(row, -1)}
                              title={fr ? 'Monter' : 'Move up'}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={index === byLevel[level].length - 1}
                              onClick={() => move(row, 1)}
                              title={fr ? 'Descendre' : 'Move down'}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            {row.origin === 'lesson' && (
                              <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title={fr ? 'Modifier' : 'Edit'}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => removeRow(row)} title={fr ? 'Retirer' : 'Remove'}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Exercise editor: same question formats as papers, lesson-side only. */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRow ? (fr ? 'Modifier l’exercice' : 'Edit exercise') : fr ? 'Nouvel exercice' : 'New exercise'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="lex-title">{fr ? 'Titre de l’exercice' : 'Exercise title'}</Label>
                <Input id="lex-title" maxLength={200} value={exTitle} onChange={(e) => setExTitle(e.target.value)} />
              </div>
              <div>
                <Label>{fr ? 'Niveau' : 'Level'}</Label>
                <Select value={exLevel} onValueChange={(v) => setExLevel(v as LessonLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LESSON_LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>{levelLabel(l, fr)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => addItem('mcq')}>
                <Plus className="h-4 w-4 mr-1" />{fr ? 'Question à choix multiple' : 'Multiple choice'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addItem('long')}>
                <Plus className="h-4 w-4 mr-1" />{fr ? 'Question rédigée' : 'Written answer'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => addItem('heading')}>
                <Plus className="h-4 w-4 mr-1" />{fr ? 'Titre' : 'Heading'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => addItem('instruction')}>
                <Plus className="h-4 w-4 mr-1" />{fr ? 'Consigne' : 'Instruction'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => addItem('passage')}>
                <Plus className="h-4 w-4 mr-1" />{fr ? 'Texte support' : 'Passage'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {fr
                ? 'Cliquez sur un texte pour le modifier, comme dans l’éditeur d’épreuves.'
                : 'Click any text to edit it, just like in the paper editor.'}
            </p>

            <div className="rounded-lg border p-4">
              <EditableExamContentRenderer
                content={items}
                onContentChange={(next: unknown) => setItems(parseExerciseContent(next))}
                showAnswers
              />
            </div>

            <details className="rounded-lg border p-3">
              <summary className="text-sm font-medium cursor-pointer">{fr ? 'Contenu (JSON)' : 'Content (JSON)'}</summary>
              <Textarea
                className="mt-3 font-mono text-xs"
                rows={10}
                value={JSON.stringify(items, null, 2)}
                onChange={(e) => {
                  try {
                    setItems(parseExerciseContent(JSON.parse(e.target.value)));
                  } catch {
                    /* ignore invalid intermediate JSON */
                  }
                }}
              />
            </details>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {countQuestions(items)} {fr ? 'questions' : 'questions'} · {totalMarks(items)} {fr ? 'points' : 'marks'}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                  {fr ? 'Annuler' : 'Cancel'}
                </Button>
                <Button type="button" onClick={saveExercise} disabled={saving}>
                  {fr ? 'Enregistrer' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link an existing paper — the paper itself is never modified. */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {fr ? 'Lier une épreuve existante' : 'Link an existing paper'} — {levelLabel(linkLevel, fr)}
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              autoFocus
              placeholder={fr ? 'Rechercher une épreuve…' : 'Search a paper…'}
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
            />
          </div>
          {searching ? (
            <Skeleton className="h-40 w-full" />
          ) : libraryExams.length === 0 ? (
            <p className="text-sm text-muted-foreground">{fr ? 'Aucune épreuve trouvée.' : 'No paper found.'}</p>
          ) : (
            <div className="space-y-2">
              {libraryExams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{exam.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {(fr ? exam.subjects?.name_fr : exam.subjects?.name_en) || '—'}
                      {exam.classes?.display_name ? ` · ${exam.classes.display_name}` : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => linkExam(exam)}>
                    {fr ? 'Ajouter' : 'Add'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
