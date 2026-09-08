import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MarkdownText } from '@/components/ui/markdown-text';
import { useLanguage } from '@/contexts/LanguageContext';
import { LessonQuestion } from '@/lib/lessonQuestions';
import { CheckCircle2, Eye, HelpCircle, XCircle } from 'lucide-react';

/**
 * Student-facing lesson questions. Answers are entered first; the correction is
 * only unlocked once every question has been answered and submitted.
 */
export default function LessonQuestions({ questions }: { questions: LessonQuestion[] }) {
  const { language } = useLanguage();
  const fr = language === 'fr';

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  const answeredCount = useMemo(
    () => questions.filter((q) => (answers[q.id] || '').trim().length > 0).length,
    [questions, answers],
  );
  const allAnswered = answeredCount === questions.length;

  const mcqs = questions.filter((q) => q.type === 'mcq');
  const correctCount = mcqs.filter((q) => answers[q.id] === String(q.correctIndex)).length;

  if (questions.length === 0) return null;

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-secondary" />
          {fr ? 'Questions de compréhension' : 'Comprehension questions'}
        </CardTitle>
        <Badge variant="outline">
          {answeredCount} / {questions.length} {fr ? 'répondues' : 'answered'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {questions.map((q, index) => {
          const given = answers[q.id] || '';
          const isCorrect = q.type === 'mcq' && given === String(q.correctIndex);
          return (
            <div key={q.id} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0 mt-0.5">{index + 1}</Badge>
                <div className="prose-sm max-w-none min-w-0">
                  <MarkdownText text={q.prompt} />
                </div>
              </div>

              {q.type === 'mcq' ? (
                <RadioGroup
                  value={given}
                  onValueChange={(v) => !submitted && setAnswers((a) => ({ ...a, [q.id]: v }))}
                  className="space-y-2"
                >
                  {(q.options || []).map((opt, oi) => {
                    const reveal = showAnswers && oi === q.correctIndex;
                    return (
                      <div
                        key={oi}
                        className={`flex items-start gap-2 rounded-md border p-2 ${reveal ? 'border-secondary bg-secondary/10' : 'border-border'}`}
                      >
                        <RadioGroupItem value={String(oi)} id={`${q.id}-${oi}`} disabled={submitted} className="mt-1" />
                        <Label htmlFor={`${q.id}-${oi}`} className="font-normal cursor-pointer prose-sm max-w-none">
                          <MarkdownText text={opt} />
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              ) : (
                <Textarea
                  rows={4}
                  value={given}
                  disabled={submitted}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder={fr ? 'Votre réponse…' : 'Your answer…'}
                />
              )}

              {submitted && q.type === 'mcq' && (
                <p className={`text-sm flex items-center gap-1.5 ${isCorrect ? 'text-secondary' : 'text-destructive'}`}>
                  {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {isCorrect ? (fr ? 'Bonne réponse' : 'Correct') : fr ? 'Réponse incorrecte' : 'Incorrect'}
                </p>
              )}

              {showAnswers && (q.answer || '').trim() && (
                <div className="rounded-md border border-secondary/40 bg-secondary/5 p-3">
                  <p className="text-xs font-medium mb-1 text-muted-foreground">
                    {fr ? 'Corrigé' : 'Solution'}
                  </p>
                  <div className="prose-sm max-w-none">
                    <MarkdownText text={q.answer || ''} />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-3">
          {!submitted ? (
            <>
              <Button onClick={() => setSubmitted(true)} disabled={!allAnswered}>
                {fr ? 'Valider mes réponses' : 'Submit my answers'}
              </Button>
              {!allAnswered && (
                <p className="text-sm text-muted-foreground">
                  {fr
                    ? 'Répondez à toutes les questions pour voir la correction.'
                    : 'Answer every question to unlock the correction.'}
                </p>
              )}
            </>
          ) : (
            <>
              {mcqs.length > 0 && (
                <Badge variant="secondary">
                  {fr ? 'Score' : 'Score'}: {correctCount} / {mcqs.length}
                </Badge>
              )}
              <Button variant={showAnswers ? 'outline' : 'default'} onClick={() => setShowAnswers((v) => !v)}>
                <Eye className="h-4 w-4 mr-2" />
                {showAnswers
                  ? fr ? 'Masquer la correction' : 'Hide the correction'
                  : fr ? 'Voir la correction' : 'View the correction'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                  setShowAnswers(false);
                }}
              >
                {fr ? 'Recommencer' : 'Try again'}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
