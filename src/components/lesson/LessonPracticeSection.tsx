import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import LessonLevelEvaluation from '@/components/lesson/LessonLevelEvaluation';
import LessonLevelCorrection from '@/components/lesson/LessonLevelCorrection';
import {
  JSON_LEVELS,
  JsonLevel,
  LessonExercises,
  countExercises,
  jsonLevelLabel,
  totalPoints,
} from '@/lib/lessonJsonExercises';
import { ArrowLeft, BookOpenCheck, ClipboardCheck, Crown, ListChecks, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MarkdownText } from '@/components/ui/markdown-text';

type Mode = 'evaluation' | 'correction';

/** Three independent level blocks, each offering an Evaluation and a Correction mode. */
export default function LessonPracticeSection({
  exercises,
  minutes,
  hasActiveSubscription,
  onLevelFinished,
  onFocusChange,
}: {
  exercises: LessonExercises;
  minutes: number;
  hasActiveSubscription: boolean;
  onLevelFinished?: (level: JsonLevel, percent: number) => void;
  onFocusChange?: (focused: boolean) => void;
}) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [level, setLevel] = useState<JsonLevel | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  // Corrections unlock only after the level was taken in Evaluation mode.
  const [doneLevels, setDoneLevels] = useState<Set<JsonLevel>>(new Set());
  // Upsell shown once a non-subscriber finishes the free exercise (moment of maximum value).
  const [upsellOpen, setUpsellOpen] = useState(false);

  useEffect(() => { onFocusChange?.(mode !== null); if (mode) window.scrollTo(0, 0); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (countExercises(exercises) === 0) return null;

  const back = () => {
    if (mode) setMode(null);
    else setLevel(null);
  };

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          {fr ? 'Exercices d’application' : 'Practice exercises'}
        </CardTitle>
        {level && (
          <Button variant="ghost" size="sm" onClick={back}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {fr ? 'Retour' : 'Back'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!level && (
          <div className="grid gap-3 sm:grid-cols-3">
            {JSON_LEVELS.map((lv) => {
              const list = exercises[lv];
              const locked = !hasActiveSubscription && lv !== 'facile';
              const tone = lv === 'facile'
                ? 'border-accent/40 bg-accent/10 hover:bg-accent/20 [&_.lv-title]:text-accent'
                : lv === 'intermediaire'
                ? 'border-secondary/40 bg-secondary/10 hover:bg-secondary/20 [&_.lv-title]:text-secondary'
                : 'border-destructive/40 bg-destructive/10 hover:bg-destructive/20 [&_.lv-title]:text-destructive';
              return (
                <Button
                  key={lv}
                  type="button"
                  variant="outline"
                  disabled={list.length === 0}
                  onClick={() => { setLevel(lv); setMode(null); }}
                  className={`h-auto min-h-24 justify-start border-2 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${tone}`}
                >
                  <span className="w-full">
                    <span className="flex items-center justify-between gap-2 font-medium">
                      {jsonLevelLabel(lv, fr)}
                      {locked && (
                        <Badge variant="secondary" className="gap-1 shrink-0">
                          <Lock className="h-3 w-3" />Premium
                        </Badge>
                      )}
                    </span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {!hasActiveSubscription && lv === 'facile'
                        ? fr ? '1 exercice gratuit' : '1 free exercise'
                        : `${list.length} ${fr ? 'exercice(s)' : 'exercise(s)'} · ${totalPoints(list)} points`}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        )}

        {level && !mode && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{jsonLevelLabel(level, fr)}</Badge>
              <span className="text-xs text-muted-foreground">
                {exercises[level].length} {fr ? 'exercice(s)' : 'exercise(s)'}
              </span>
            </div>
            {!hasActiveSubscription && level !== 'facile' ? (
              <div className="space-y-3">
                {/* Blurred preview of the locked content: people pay more easily for what they can see. */}
                {exercises[level].slice(0, 2).map((ex, i) => (
                  <div key={i} className="relative overflow-hidden rounded-lg border p-4 select-none" aria-hidden>
                    <div className="pointer-events-none blur-sm opacity-60">
                      <MarkdownText text={`**${i + 1}.** ${ex.question}`} />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Badge variant="secondary" className="gap-1 shadow-sm">
                        <Lock className="h-3 w-3" />Premium
                      </Badge>
                    </div>
                  </div>
                ))}
                <div className="space-y-3 rounded-lg border border-secondary/40 p-5 text-center">
                  <Lock className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="font-medium">
                    {fr ? 'Ces exercices sont réservés aux abonnés' : 'These exercises are for subscribers'}
                  </p>
                  <Button asChild size="sm">
                    <a href="/subscriptions">{fr ? 'Débloquer avec un abonnement' : 'Unlock with a plan'}</a>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button onClick={() => setMode('evaluation')}>
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    {fr ? 'Évaluation' : 'Evaluation'}
                  </Button>
                  <Button variant="outline" disabled={!doneLevels.has(level)} onClick={() => setMode('correction')}>
                    <BookOpenCheck className="h-4 w-4 mr-2" />
                    {fr ? 'Corrigé' : 'Correction'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fr
                    ? `Le mode Évaluation est chronométré (${Math.max(1, minutes)} min).${doneLevels.has(level) ? '' : ' Le corrigé se débloque après l’évaluation.'}`
                    : `Evaluation mode is timed (${Math.max(1, minutes)} min).${doneLevels.has(level) ? '' : ' The correction unlocks after the evaluation.'}`}
                </p>
              </>
            )}
          </div>
        )}

        {level && mode === 'evaluation' && (
          <LessonLevelEvaluation
            key={level}
            exercises={hasActiveSubscription ? exercises[level] : exercises[level].slice(0, 1)}
            minutes={minutes}
            level={level}
            onFinished={(percent) => {
              setDoneLevels((d) => new Set(d).add(level));
              onLevelFinished?.(level, percent);
              if (!hasActiveSubscription) setUpsellOpen(true);
            }}
          />
        )}

        {level && mode === 'correction' && (
          <LessonLevelCorrection exercises={hasActiveSubscription ? exercises[level] : exercises[level].slice(0, 1)} />
        )}
      </CardContent>

      {/* Upsell at the moment of maximum value: right after the free exercise. */}
      <Dialog open={upsellOpen} onOpenChange={setUpsellOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-secondary" />
              {fr ? 'Bravo, exercice terminé !' : 'Well done, exercise completed!'}
            </DialogTitle>
            <DialogDescription>
              {fr
                ? 'Débloquez les 2 autres niveaux (Intermédiaire et Difficile) + le corrigé détaillé pour progresser vraiment.'
                : 'Unlock the 2 other levels (Intermediate and Hard) + the detailed correction to really progress.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setUpsellOpen(false)}>
              {fr ? 'Plus tard' : 'Later'}
            </Button>
            <Button asChild className="gradient-primary">
              <a href="/subscriptions">{fr ? 'Débloquer maintenant' : 'Unlock now'}</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
