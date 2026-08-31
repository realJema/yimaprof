import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import SeoHead from '@/components/SeoHead';
import ProtectedContent from '@/components/security/ProtectedContent';
import { ExamContentRenderer } from '@/components/exam/ExamContentRenderer';
import { EvaluationTimer } from '@/components/exam/EvaluationTimer';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock,
  Lock,
  Maximize,
  Play,
  Send,
  Trophy,
} from 'lucide-react';
import { scoreMcqContent, type SimpleAnswer } from '@/lib/examScoring';
import { formatScaled, gradeMention, gradeTextColor, scaleScore } from '@/lib/grading';
import {
  clearChallengeSession,
  enqueueChallengeSubmission,
  loadChallengeSession,
  markChallengeViewed,
  saveChallengeSession,
  wasChallengeViewed,
} from '@/lib/challengeSession';

interface ChallengeRow {
  id: string;
  title: string;
  description: string | null;
  scope: string;
  region: string | null;
  status: string;
  reward: string | null;
  starts_at: string;
  ends_at: string;
  exam_id: string | null;
  duration_minutes: number;
  graded_out_of: number;
  establishment_id: string | null;
  eligible_class_ids: string[] | null;
  eligible_series_ids: string[] | null;
}

interface ExamRow {
  id: string;
  title: string;
  content: unknown;
  class_id: string | null;
  series_id: string | null;
  subjects?: { name_fr: string | null; name_en: string | null } | null;
}

export default function ChallengeDetail() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<ChallengeRow | null>(null);
  const [exam, setExam] = useState<ExamRow | null>(null);
  const [attempt, setAttempt] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [running, setRunning] = useState(false);
  const [answers, setAnswers] = useState<SimpleAnswer[]>([]);
  const [remaining, setRemaining] = useState<number | undefined>(undefined);
  const [timeSpent, setTimeSpent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [warned, setWarned] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const outOf = challenge?.graded_out_of ?? 20;

  useEffect(() => {
    if (!challengeId) return;
    (async () => {
      const { data: ch } = await supabase
        .from('challenges')
        .select(
          'id, title, description, scope, region, status, reward, starts_at, ends_at, exam_id, duration_minutes, graded_out_of, establishment_id, eligible_class_ids, eligible_series_ids',
        )
        .eq('id', challengeId)
        .maybeSingle();
      const row = (ch as unknown as ChallengeRow) || null;
      setChallenge(row);

      if (row?.exam_id) {
        const { data: ex } = await supabase
          .from('exams')
          .select('id, title, content, class_id, series_id, subjects(name_fr, name_en)')
          .eq('id', row.exam_id)
          .maybeSingle();
        setExam((ex as unknown as ExamRow) || null);
      }

      if (user) {
        const { data: att } = await supabase
          .from('challenge_attempts')
          .select('*')
          .eq('challenge_id', challengeId)
          .eq('user_id', user.id)
          .maybeSingle();
        setAttempt(att || null);
        // Consulting the paper outside a session is recorded (yes/no flag).
        markChallengeViewed(user.id, challengeId);
      }
      setLoading(false);
    })();
  }, [challengeId, user]);

  // Resume a locally saved session after a connection loss / reload.
  useEffect(() => {
    if (!user || !challengeId || attempt) return;
    const saved = loadChallengeSession(user.id, challengeId);
    if (saved) {
      setAnswers(saved.answers || []);
      setRemaining(saved.remainingSeconds);
      setTimeSpent(saved.timeSpentSeconds || 0);
      setRunning(true);
    }
  }, [user, challengeId, attempt]);

  const persist = useCallback(
    (next: Partial<{ answers: SimpleAnswer[]; remainingSeconds: number; timeSpentSeconds: number }>) => {
      if (!user || !challengeId || !challenge) return;
      saveChallengeSession({
        version: 1,
        challengeId,
        userId: user.id,
        answers: next.answers ?? answers,
        remainingSeconds: next.remainingSeconds ?? remaining ?? challenge.duration_minutes * 60,
        timeSpentSeconds: next.timeSpentSeconds ?? timeSpent,
        viewedBefore: wasChallengeViewed(user.id, challengeId),
        startedAt: Date.now(),
        updatedAt: Date.now(),
      });
    },
    [user, challengeId, challenge, answers, remaining, timeSpent],
  );

  const eligible = useMemo(() => {
    if (!challenge) return false;
    const classes = challenge.eligible_class_ids || [];
    const series = challenge.eligible_series_ids || [];
    if (!classes.length && !series.length) return true;
    if (!exam) return true;
    const classOk = !classes.length || (exam.class_id ? classes.includes(exam.class_id) : false);
    const seriesOk = !series.length || (exam.series_id ? series.includes(exam.series_id) : false);
    return classOk && seriesOk;
  }, [challenge, exam]);

  const ended = challenge ? new Date(challenge.ends_at).getTime() < Date.now() : false;
  const notStarted = challenge ? new Date(challenge.starts_at).getTime() > Date.now() : false;
  const alreadyDone = !!attempt;

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setAnswers((prev) => {
      const next = prev.filter((a) => a.questionIndex !== questionIndex).concat({ questionIndex, answer });
      persist({ answers: next });
      return next;
    });
  };

  const enterFullscreen = async () => {
    try {
      await containerRef.current?.requestFullscreen?.();
    } catch {
      // fullscreen may be refused; the session still runs
    }
  };

  const start = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setRunning(true);
    setRemaining((challenge?.duration_minutes ?? 30) * 60);
    persist({ remainingSeconds: (challenge?.duration_minutes ?? 30) * 60, timeSpentSeconds: 0 });
    await enterFullscreen();
  };

  // Locked screen: warn on every fullscreen exit and block navigation away.
  useEffect(() => {
    if (!running) return;
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setWarned((w) => w + 1);
        toast.warning(
          fr
            ? 'Vous avez quitté le plein écran. Revenez immédiatement, cette sortie est enregistrée.'
            : 'You left fullscreen. Come back now, this exit is recorded.',
        );
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [running, fr]);

  const submit = useCallback(
    async (auto = false) => {
      if (!user || !challenge || submitting) return;
      setSubmitting(true);
      const result = scoreMcqContent(exam?.content, answers);
      const payload = {
        challenge_id: challenge.id,
        user_id: user.id,
        establishment_id: challenge.establishment_id,
        viewed_before: wasChallengeViewed(user.id, challenge.id),
        started_at: new Date(Date.now() - timeSpent * 1000).toISOString(),
        submitted_at: new Date().toISOString(),
        time_spent_seconds: timeSpent,
        answers: answers as unknown as any,
        score: result.earnedPoints,
        total_possible: result.totalPoints,
        graded_out_of: outOf,
        score_scaled: scaleScore(result.earnedPoints, result.totalPoints, outOf),
        status: 'submitted',
      };

      if (!navigator.onLine) {
        enqueueChallengeSubmission({
          version: 1,
          id: crypto.randomUUID?.() ?? `${Date.now()}`,
          createdAt: Date.now(),
          challengeId: challenge.id,
          userId: user.id,
          payload: payload as unknown as Record<string, unknown>,
        });
        toast.info(
          fr
            ? 'Hors ligne : votre copie est enregistrée et sera envoyée à la reconnexion.'
            : 'Offline: your paper is saved and will be sent once you reconnect.',
        );
      } else {
        const { error } = await supabase.from('challenge_attempts').insert(payload as any);
        if (error) {
          enqueueChallengeSubmission({
            version: 1,
            id: crypto.randomUUID?.() ?? `${Date.now()}`,
            createdAt: Date.now(),
            challengeId: challenge.id,
            userId: user.id,
            payload: payload as unknown as Record<string, unknown>,
          });
          toast.error(fr ? 'Envoi différé, copie sauvegardée.' : 'Submission deferred, paper saved.');
        } else {
          toast.success(
            auto
              ? fr
                ? 'Temps écoulé, copie soumise.'
                : 'Time is up, paper submitted.'
              : fr
                ? 'Copie soumise.'
                : 'Paper submitted.',
          );
        }
      }

      clearChallengeSession(user.id, challenge.id);
      setAttempt(payload);
      setRunning(false);
      setSubmitting(false);
      if (document.fullscreenElement) document.exitFullscreen?.();
    },
    [user, challenge, submitting, exam, answers, timeSpent, outOf, fr],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted-foreground">{fr ? 'Challenge introuvable.' : 'Challenge not found.'}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/challenges">{fr ? 'Retour aux challenges' : 'Back to challenges'}</Link>
        </Button>
      </div>
    );
  }

  const canTake = !!user && eligible && !alreadyDone && !ended && !notStarted && !!exam?.content;

  return (
    <div ref={containerRef} className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <SeoHead
        title={`${challenge.title} | Yimaprof`}
        description={challenge.description || (fr ? 'Challenge Yimaprof' : 'Yimaprof challenge')}
        path={`/challenges/${challenge.id}`}
      />

      {!running && (
        <Button variant="ghost" size="sm" className="mb-4" asChild>
          <Link to="/challenges">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {fr ? 'Challenges' : 'Challenges'}
          </Link>
        </Button>
      )}

      <div className="mb-6 rounded-2xl gradient-hero p-6 text-white">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6" />
          <h1 className="text-xl font-bold sm:text-2xl">{challenge.title}</h1>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/85">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(challenge.starts_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')} →{' '}
            {new Date(challenge.ends_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {challenge.duration_minutes} min
          </span>
          <span className="flex items-center gap-1">
            <Award className="h-3.5 w-3.5" />/{outOf}
          </span>
          {challenge.region && <Badge variant="outline" className="border-white/30 text-white">{challenge.region}</Badge>}
        </div>
        {challenge.description && <p className="mt-3 text-sm text-white/90">{challenge.description}</p>}
      </div>

      {running && (
        <div className="sticky top-0 z-30 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/95 p-3 backdrop-blur">
          <EvaluationTimer
            totalSeconds={challenge.duration_minutes * 60}
            initialSeconds={remaining}
            isPaused={false}
            onTimeUp={() => submit(true)}
            onTick={(sec) => {
              setRemaining(sec);
              setTimeSpent((t) => {
                const nt = t + 1;
                persist({ remainingSeconds: sec, timeSpentSeconds: nt });
                return nt;
              });
            }}
          />
          <div className="flex items-center gap-2">
            {!document.fullscreenElement && (
              <Button variant="outline" size="sm" onClick={enterFullscreen}>
                <Maximize className="mr-2 h-4 w-4" />
                {fr ? 'Plein écran' : 'Fullscreen'}
              </Button>
            )}
            <Button size="sm" onClick={() => submit(false)} disabled={submitting}>
              <Send className="mr-2 h-4 w-4" />
              {fr ? 'Soumettre' : 'Submit'}
            </Button>
          </div>
        </div>
      )}

      {alreadyDone && (
        <Card className="mb-6 border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-medium">{fr ? 'Challenge déjà passé' : 'Challenge already taken'}</p>
                <p className="text-xs text-muted-foreground">
                  {fr ? 'Une seule tentative autorisée.' : 'One attempt only.'}
                  {attempt?.time_spent_seconds
                    ? ` · ${Math.round(attempt.time_spent_seconds / 60)} min · ${
                        attempt.viewed_before
                          ? fr
                            ? 'épreuve consultée avant'
                            : 'paper viewed before'
                          : fr
                            ? 'épreuve non consultée avant'
                            : 'paper not viewed before'
                      }`
                    : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${gradeTextColor((attempt?.score_scaled ?? 0) / outOf)}`}>
                {formatScaled(attempt?.score_scaled, outOf)}
              </p>
              <p className="text-xs text-muted-foreground">
                {gradeMention((attempt?.score_scaled ?? 0) / outOf, fr)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!running && !alreadyDone && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{fr ? 'Passer le challenge' : 'Take the challenge'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• {fr ? 'Une seule tentative, pas de correction affichée.' : 'One single attempt, no correction shown.'}</li>
              <li>• {fr ? 'Écran occupé : plein écran forcé, sorties enregistrées.' : 'Locked screen: fullscreen enforced, exits recorded.'}</li>
              <li>
                • {fr
                  ? 'Coupure internet : vos réponses sont sauvegardées et envoyées à la reconnexion.'
                  : 'Connection loss: your answers are saved and sent on reconnection.'}
              </li>
            </ul>
            {!user ? (
              <Button asChild>
                <Link to="/auth">{fr ? 'Se connecter pour participer' : 'Sign in to take part'}</Link>
              </Button>
            ) : !eligible ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                {fr
                  ? 'Vous ne remplissez pas les critères (classe / série) de ce challenge.'
                  : 'You do not match this challenge criteria (class / series).'}
              </div>
            ) : notStarted || ended || !exam?.content ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                {notStarted
                  ? fr
                    ? 'Le challenge n’a pas encore commencé.'
                    : 'The challenge has not started yet.'
                  : ended
                    ? fr
                      ? 'Le challenge est terminé.'
                      : 'The challenge has ended.'
                    : fr
                      ? 'Aucune épreuve rattachée à ce challenge.'
                      : 'No paper attached to this challenge.'}
              </div>
            ) : (
              <Button onClick={start} disabled={!canTake}>
                <Play className="mr-2 h-4 w-4" />
                {fr ? 'Passer le challenge' : 'Start the challenge'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {warned > 0 && running && (
        <p className="mb-4 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          {fr ? `Sorties de plein écran : ${warned}` : `Fullscreen exits: ${warned}`}
        </p>
      )}

      {/* The paper is shown exactly like a Yima exam, without any correction. */}
      {exam?.content ? (
        <ProtectedContent>
          <ExamContentRenderer
            content={exam.content}
            showAnswers={false}
            mode={running ? 'evaluation' : 'preview'}
            questionIdPrefix="question-"
            userAnswers={running ? answers : []}
            onAnswerChange={running ? handleAnswerChange : undefined}
          />
        </ProtectedContent>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {fr ? 'Épreuve non disponible.' : 'Paper not available.'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
