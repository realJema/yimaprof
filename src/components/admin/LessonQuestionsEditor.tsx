import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MarkdownText } from '@/components/ui/markdown-text';
import { useLanguage } from '@/contexts/LanguageContext';
import { LessonQuestion, newLessonQuestion } from '@/lib/lessonQuestions';
import { ArrowDown, ArrowUp, CheckCircle2, Plus, Trash2 } from 'lucide-react';

/**
 * Editor for the questions of a lesson. Prompts, options and answers accept
 * Markdown and LaTeX, previewed live below each field.
 */
export default function LessonQuestionsEditor({
  value,
  onChange,
}: {
  value: LessonQuestion[];
  onChange: (questions: LessonQuestion[]) => void;
}) {
  const { language } = useLanguage();
  const fr = language === 'fr';

  const update = (index: number, patch: Partial<LessonQuestion>) =>
    onChange(value.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const setType = (index: number, type: LessonQuestion['type']) =>
    update(index, {
      type,
      options: type === 'mcq' ? value[index].options?.length ? value[index].options : ['', ''] : undefined,
      correctIndex: type === 'mcq' ? value[index].correctIndex ?? 0 : undefined,
    });

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{fr ? 'Questions de la leçon' : 'Lesson questions'}</p>
          <p className="text-xs text-muted-foreground">
            {fr
              ? 'Mise en forme enrichie : **gras**, *italique*, listes et formules $x^2$.'
              : 'Rich formatting: **bold**, *italic*, lists and formulas $x^2$.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, newLessonQuestion('mcq')])}>
            <Plus className="h-4 w-4 mr-1" />
            {fr ? 'Choix multiple' : 'Multiple choice'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, newLessonQuestion('open')])}>
            <Plus className="h-4 w-4 mr-1" />
            {fr ? 'Question ouverte' : 'Open question'}
          </Button>
        </div>
      </div>

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {fr ? 'Aucune question pour le moment.' : 'No question yet.'}
        </p>
      )}

      {value.map((q, index) => (
        <div key={q.id} className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline">{fr ? 'Question' : 'Question'} {index + 1}</Badge>
            <div className="flex items-center gap-1.5">
              <Select value={q.type} onValueChange={(v) => setType(index, v as LessonQuestion['type'])}>
                <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">{fr ? 'Choix multiple' : 'Multiple choice'}</SelectItem>
                  <SelectItem value="open">{fr ? 'Question ouverte' : 'Open question'}</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="icon" onClick={() => move(index, -1)} disabled={index === 0}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => move(index, 1)} disabled={index === value.length - 1}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor={`lq-prompt-${q.id}`}>{fr ? 'Énoncé' : 'Question text'}</Label>
            <Textarea
              id={`lq-prompt-${q.id}`}
              rows={3}
              value={q.prompt}
              onChange={(e) => update(index, { prompt: e.target.value })}
              placeholder={fr ? 'Écrivez la question…' : 'Write the question…'}
            />
            {q.prompt.trim() && (
              <div className="mt-2 rounded-md border bg-card p-2 prose-sm max-w-none">
                <MarkdownText text={q.prompt} />
              </div>
            )}
          </div>

          {q.type === 'mcq' && (
            <div className="space-y-2">
              <Label>{fr ? 'Propositions (cochez la bonne)' : 'Options (tick the correct one)'}</Label>
              {(q.options || []).map((opt, oi) => (
                <div key={oi} className="flex items-start gap-2">
                  <Button
                    type="button"
                    variant={q.correctIndex === oi ? 'secondary' : 'outline'}
                    size="icon"
                    className="mt-0.5 shrink-0"
                    title={fr ? 'Bonne réponse' : 'Correct answer'}
                    onClick={() => update(index, { correctIndex: oi })}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Input
                    value={opt}
                    onChange={(e) =>
                      update(index, { options: (q.options || []).map((o, i) => (i === oi ? e.target.value : o)) })
                    }
                    placeholder={`${fr ? 'Proposition' : 'Option'} ${oi + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    disabled={(q.options || []).length <= 2}
                    onClick={() => {
                      const options = (q.options || []).filter((_, i) => i !== oi);
                      update(index, {
                        options,
                        correctIndex: Math.min(q.correctIndex ?? 0, options.length - 1),
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => update(index, { options: [...(q.options || []), ''] })}
              >
                <Plus className="h-4 w-4 mr-1" />
                {fr ? 'Ajouter une proposition' : 'Add an option'}
              </Button>
            </div>
          )}

          <div>
            <Label htmlFor={`lq-answer-${q.id}`}>
              {q.type === 'open'
                ? fr ? 'Réponse attendue (corrigé)' : 'Expected answer (solution)'
                : fr ? 'Explication (optionnelle)' : 'Explanation (optional)'}
            </Label>
            <Textarea
              id={`lq-answer-${q.id}`}
              rows={3}
              value={q.answer || ''}
              onChange={(e) => update(index, { answer: e.target.value })}
            />
            {(q.answer || '').trim() && (
              <div className="mt-2 rounded-md border bg-card p-2 prose-sm max-w-none">
                <MarkdownText text={q.answer || ''} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
