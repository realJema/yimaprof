import { useState } from 'react';
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
import { ArrowLeft, BookOpenCheck, ClipboardCheck, ListChecks, Lock } from 'lucide-react';

type Mode = 'evaluation' | 'correction';

/** Three independent level blocks, each offering an Evaluation and a Correction mode. */
export default function LessonPracticeSection({
  exercises,
  minutes,
  hasActiveSubscription,
  onLevelFinished,
}: {
  exercises: LessonExercises;
  minutes: number;
  hasActiveSubscription: boolean;
  onLevelFinished?: (level: JsonLevel, percent: number) => void;
}) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [level, setLevel] = useState<JsonLevel | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);

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
              return (
                <Button
                  key={lv}
                  type="button"
                  variant="outline"
                  disabled={list.length === 0}
                  onClick={() => { setLevel(lv); setMode(null); }}
                  className="h-auto min-h-24 justify-start p-4 text-left"
                >
                  <span className="w-full">
                    <span className="flex items-center justify-between gap-2 font-medium">
                      {jsonLevelLabel(lv, fr)}
                      {locked && <Lock className="h-4 w-4 text-muted-foreground" />}
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
              <div className="space-y-3 rounded-lg border border-secondary/40 p-5 text-center">
                <Lock className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="font-medium">
                  {fr ? 'Ces exercices sont réservés aux abonnés' : 'These exercises are for subscribers'}
                </p>
                <Button asChild size="sm">
                  <a href="/subscriptions">{fr ? 'Voir les abonnements' : 'See plans'}</a>
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button onClick={() => setMode('evaluation')}>
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    {fr ? 'Évaluation' : 'Evaluation'}
                  </Button>
                  <Button variant="outline" onClick={() => setMode('correction')}>
                    <BookOpenCheck className="h-4 w-4 mr-2" />
                    {fr ? 'Corrigé' : 'Correction'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fr
                    ? `Le mode Évaluation est chronométré (${Math.max(1, minutes)} min).`
                    : `Evaluation mode is timed (${Math.max(1, minutes)} min).`}
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
            onFinished={(percent) => onLevelFinished?.(level, percent)}
          />
        )}

        {level && mode === 'correction' && (
          <LessonLevelCorrection exercises={hasActiveSubscription ? exercises[level] : exercises[level].slice(0, 1)} />
        )}
      </CardContent>
    </Card>
  );
}
