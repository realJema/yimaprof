import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarkdownText } from '@/components/ui/markdown-text';
import { useLanguage } from '@/contexts/LanguageContext';
import { JsonExercise, isMcqExercise, totalPoints } from '@/lib/lessonJsonExercises';
import { AlertTriangle, CheckCircle2, Clock, RotateCcw } from 'lucide-react';

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/**
 * Timed evaluation for one lesson level. The countdown is derived client-side
 * from the lesson duration; it is cleared when the component unmounts.
 */
export default function LessonLevelEvaluation({
  exercises,
  minutes,
  onFinished,
}: {
  exercises: JsonExercise[];
  minutes: number;
  onFinished?: (percent: number) => void;
}) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const total = useMemo(() => totalPoints(exercises), [exercises]);

  const [attempt, setAttempt] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [remaining, setRemaining] = useState(Math.max(1, minutes) * 60);
  const submittedRef = useRef(false);

  useEffect(() => {
    submittedRef.current = false;
    setAnswers({});
    setSubmitted(false);
    setTimedOut(false);
    setRemaining(Math.max(1, minutes) * 60);

    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          if (!submittedRef.current) {
            submittedRef.current = true;
            setTimedOut(true);
            setSubmitted(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [attempt, minutes]);

  const score = useMemo(
    () =>
      exercises.reduce(
        (sum, ex, index) =>
          (answers[index] ?? '').trim().toLowerCase() === ex.answer.trim().toLowerCase()
            ? sum + (Number(ex.points) || 0)
            : sum,
        0,
      ),
    [answers, exercises],
  );

  const correctCount = exercises.filter(
    (ex, index) => (answers[index] ?? '').trim().toLowerCase() === ex.answer.trim().toLowerCase(),
  ).length;

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
  };

  useEffect(() => {
    if (submitted && onFinished && total > 0) onFinished(Math.round((score / total) * 100));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  if (submitted) {
    return (
      <div className="space-y-4">
        {timedOut && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            {fr
              ? 'Le temps est écoulé : vos réponses ont été soumises automatiquement.'
              : 'Time is up: your answers were submitted automatically.'}
          </div>
        )}
        <Card>
          <CardContent className="py-6 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 mx-auto text-secondary" />
            <p className="text-2xl font-bold">{score} / {total}</p>
            <p className="text-sm text-muted-foreground">
              {fr
                ? `${correctCount} bonne(s) réponse(s) sur ${exercises.length}`
                : `${correctCount} correct answer(s) out of ${exercises.length}`}
            </p>
            <Button variant="outline" size="sm" onClick={() => setAttempt((a) => a + 1)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {fr ? 'Recommencer' : 'Try again'}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {exercises.map((ex, index) => {
            const given = answers[index] ?? '';
            const ok = given.trim().toLowerCase() === ex.answer.trim().toLowerCase();
            return (
              <Card key={index} className={ok ? 'border-secondary/40' : 'border-destructive/40'}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <MarkdownText text={`**${index + 1}.** ${ex.question}`} />
                    <Badge variant={ok ? 'secondary' : 'outline'}>{ok ? `+${ex.points}` : '0'}</Badge>
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">{fr ? 'Votre réponse : ' : 'Your answer: '}</span>
                    {given || (fr ? '— (sans réponse)' : '— (no answer)')}
                  </p>
                  {!ok && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">{fr ? 'Bonne réponse : ' : 'Correct answer: '}</span>
                      {ex.answer}
                    </p>
                  )}
                  {ex.correction && (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <MarkdownText text={ex.correction} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const urgent = remaining <= 60;

  return (
    <div className="space-y-4">
      <div
        className={`sticky top-16 z-10 flex items-center justify-between gap-3 rounded-lg border p-3 backdrop-blur ${
          urgent ? 'border-destructive bg-destructive/10 animate-pulse' : 'bg-card'
        }`}
      >
        <span className={`flex items-center gap-2 font-mono text-lg font-semibold ${urgent ? 'text-destructive' : ''}`}>
          <Clock className="h-4 w-4" />
          {fmt(remaining)}
        </span>
        <span className="text-xs text-muted-foreground">
          {fr ? `${exercises.length} question(s) · ${total} points` : `${exercises.length} question(s) · ${total} points`}
        </span>
      </div>

      {exercises.map((ex, index) => (
        <Card key={index}>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <MarkdownText text={`**${index + 1}.** ${ex.question}`} />
              <Badge variant="outline" className="shrink-0">{ex.points} pt</Badge>
            </div>
            {isMcqExercise(ex) ? (
              <div className="space-y-2">
                {ex.options!.map((option) => {
                  const selected = answers[index] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [index]: option }))}
                      className={`w-full text-left rounded-lg border p-3 text-sm transition-colors ${
                        selected ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                className="w-full min-h-24 rounded-lg border border-input bg-background p-3 text-sm"
                value={answers[index] ?? ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [index]: e.target.value }))}
                placeholder={fr ? 'Votre réponse…' : 'Your answer…'}
              />
            )}
          </CardContent>
        </Card>
      ))}

      <Button className="w-full" onClick={submit}>
        {fr ? 'Valider mes réponses' : 'Submit my answers'}
      </Button>
    </div>
  );
}
