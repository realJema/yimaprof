import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, differenceInCalendarWeeks } from 'date-fns';
import { ArrowRight, ArrowLeft, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, Target, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudyGuide } from '@/hooks/useStudyGuide';
import { useStudyPreferences } from '@/hooks/useStudyPreferences';
import { analyzeDifficulties, dateKey, daysUntil, nextStudyAction, revisionWeek, weeklySummary } from '@/lib/studyGuide';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import StudyDeadlineCard from './StudyDeadlineCard';

export default function StudyGuide({ userId, compact = false }: { userId?: string; compact?: boolean }) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { toast } = useToast();
  const data = useStudyGuide(userId, language);
  const settings = useStudyPreferences(userId);
  const [weekOffset, setWeekOffset] = useState(0);
  const [planOffset, setPlanOffset] = useState(0);
  const now = new Date();
  const results = data.data || [];
  const summary = weeklySummary(results, now, weekOffset);
  const current = weeklySummary(results, now);
  const previous = weeklySummary(results, now, weekOffset - 1);
  const difficulties = analyzeDifficulties(results);
  const action = nextStudyAction(results);
  const goal = settings.preferences.weekly_goal;
  const dateLabel = (d: Date) => d.toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' });
  const levelLabel = (level: string) => ({ facile: fr ? 'Facile' : 'Easy', intermediaire: fr ? 'Intermédiaire' : 'Intermediate', difficile: fr ? 'Difficile' : 'Hard' }[level] || level);
  const actionLabel = action.kind === 'start' ? (fr ? 'Choisir une première leçon' : 'Choose a first lesson')
    : action.kind === 'review' ? (action.result?.lessonId ? (fr ? 'Revoir la leçon et reprendre les bases' : 'Review the lesson and rebuild the basics') : (fr ? 'Reprendre une épreuve de cette matière' : 'Review a paper in this subject'))
    : action.kind === 'practice' ? (fr ? `S’entraîner au niveau ${levelLabel(action.level)}` : `Practise at ${levelLabel(action.level)} level`)
    : (fr ? 'Faire une évaluation de cette matière' : 'Take an assessment in this subject');
  const sections = [fr ? 'Suivi hebdomadaire' : 'Weekly review', fr ? 'Analyse des difficultés' : 'Learning difficulties', fr ? 'Prochaine action recommandée' : 'Recommended next action', fr ? 'Plan de révision' : 'Revision plan'];
  const anchors = ['weekly-review', 'difficulties', 'next-action', 'revision-plan'];
  if (!userId) return null;
  if (data.isPending || settings.isPending) return <Skeleton className="h-48 w-full mb-8" />;
  if (data.isError || settings.isError) return <div role="alert" className="py-6 space-y-3">
    <p>{fr ? 'Votre guide est momentanément indisponible. Vos résultats sont conservés.' : 'Your guide is temporarily unavailable. Your results are safe.'}</p>
    <Button variant="outline" onClick={() => { void data.refetch(); void settings.refetch(); }}><RefreshCw className="h-4 w-4 mr-2" />{fr ? 'Réessayer' : 'Retry'}</Button>
  </div>;

  if (compact) return <section className="mb-8 border-y border-border py-6" aria-label={fr ? 'Mon guide de révision' : 'My revision guide'}>
    <div className="flex flex-col sm:flex-row gap-4 justify-between">
      <div className="min-w-0 space-y-2">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Target className="h-5 w-5 text-secondary" />{fr ? 'Mon guide de révision' : 'My revision guide'}</h2>
        <p className="text-sm text-muted-foreground">{fr ? 'Cette semaine' : 'This week'} : <strong className="text-foreground">{current.total} / {goal}</strong> {fr ? 'évaluations notées' : 'graded assessments'}{current.average !== null ? ` · ${current.average}%` : ''}</p>
        <p className="font-medium">{actionLabel}{action.result ? ` · ${action.result.subject}` : ''}</p>
      </div>
      <Button asChild variant="outline" className="self-start shrink-0"><Link to="/progress#study-guide">{fr ? 'Ouvrir mon guide' : 'Open my guide'}<ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
    </div>
  </section>;

  const deadline = settings.deadline;
  const lastPlanOffset = deadline ? Math.max(0, differenceInCalendarWeeks(new Date(`${deadline.date}T00:00:00`), now, { weekStartsOn: 1 })) : 0;
  const safePlanOffset = Math.min(planOffset, lastPlanOffset);
  const sessions = deadline ? revisionWeek(results, deadline, goal, now, safePlanOffset) : [];
  const planStart = addDays(current.start, safePlanOffset * 7);
  return <div id="study-guide" className="mb-10 scroll-mt-24">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h2 className="text-2xl font-bold">{fr ? 'Mon guide d’apprentissage' : 'My learning guide'}</h2>
      <Button size="icon" variant="ghost" aria-label={fr ? 'Actualiser mes résultats' : 'Refresh my results'} title={fr ? 'Actualiser mes résultats' : 'Refresh my results'} disabled={data.isFetching} onClick={() => { void data.refetch(); void settings.refetch(); }}><RefreshCw className={`h-4 w-4 ${data.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`} /></Button>
    </div>
    <nav aria-label={fr ? 'Étapes du guide' : 'Guide steps'} className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
      {sections.map((name, i) => <Button asChild variant="outline" key={name} className="h-auto min-h-12 justify-start whitespace-normal text-left"><a href={`#${anchors[i]}`}><span className="text-secondary font-bold mr-2">0{i + 1}</span>{name}</a></Button>)}
    </nav>

    <section id="weekly-review" className="py-6 border-t border-border scroll-mt-24">
      <StepHeading index={1} title={sections[0]} icon={BarChart3} />
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label={fr ? 'Semaine précédente' : 'Previous week'} disabled={weekOffset <= -11} onClick={() => setWeekOffset(v => v - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium min-w-36 text-center">{dateLabel(summary.start)} – {dateLabel(addDays(summary.end, -1))}</span>
          <Button size="icon" variant="ghost" aria-label={fr ? 'Semaine suivante' : 'Next week'} disabled={weekOffset === 0} onClick={() => setWeekOffset(v => v + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="weekly-goal">{fr ? 'Objectif actuel' : 'Current goal'}</label>
          <Select value={String(goal)} disabled={settings.saving} onValueChange={async value => {
            try { await settings.save({ weekly_goal: Number(value) }); }
            catch { toast({ title: fr ? 'Objectif non enregistré' : 'Goal not saved', description: fr ? 'Vérifiez votre connexion et réessayez.' : 'Check your connection and try again.', variant: 'destructive' }); }
          }}><SelectTrigger id="weekly-goal" className="w-24"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 21 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
        {[
          [summary.total, fr ? 'Évaluations soumises et notées' : 'Submitted, graded assessments'],
          [summary.average === null ? '—' : `${summary.average}%`, fr ? 'Moyenne de la semaine' : 'Weekly average'],
          [summary.exams, fr ? 'Épreuves, dont épreuves liées' : 'Papers, including linked papers'],
          [summary.exercises, fr ? 'Exercices de leçon' : 'Lesson exercises'],
        ].map(([value, label]) => <div key={label} className="border-l-2 border-primary/30 pl-3"><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground mt-1">{label}</p></div>)}
      </div>
      <Progress value={Math.min(100, summary.total / goal * 100)} className="h-2" />
      <p className="text-sm mt-2">{summary.total} / {goal} · {summary.total >= goal ? (fr ? 'Objectif atteint, bravo !' : 'Goal reached, well done!') : (fr ? `${goal - summary.total} évaluation(s) pour atteindre votre objectif` : `${goal - summary.total} assessment(s) to reach your goal`)}</p>
      <p className="text-sm text-muted-foreground mt-2">{summary.total === 0 ? (fr ? 'Aucun résultat noté cette semaine. Commencez par une leçon, puis un exercice facile.' : 'No graded results this week. Start with a lesson, then an easy exercise.') : (fr ? `${summary.days} jour(s) de pratique évaluée.` : `${summary.days} day(s) of assessed practice.`)} {summary.average !== null && previous.average !== null ? (fr ? `Moyenne précédente : ${previous.average}% (${summary.average - previous.average >= 0 ? '+' : ''}${summary.average - previous.average} points).` : `Previous average: ${previous.average}% (${summary.average - previous.average >= 0 ? '+' : ''}${summary.average - previous.average} points).`) : ''}</p>
      <details className="mt-4"><summary className="cursor-pointer text-sm font-medium">{fr ? 'Résultats de la semaine' : 'Weekly results'} ({summary.total})</summary><ul className="mt-3 divide-y divide-border">
        {summary.results.map(r => <li key={r.attemptKey} className="py-3 flex items-center justify-between gap-3"><Link className="min-w-0 text-sm hover:underline" to={r.lessonId ? `/lessons/${r.lessonId}` : r.examId ? `/exam/${r.examId}` : '/exams2'}><span className="font-medium break-words">{r.title}</span><span className="block text-muted-foreground">{r.subject} · {dateLabel(new Date(r.date))}{r.level ? ` · ${levelLabel(r.level)}` : ''}</span></Link><Badge variant="secondary" className="shrink-0">{r.percent}%</Badge></li>)}
      </ul></details>
    </section>

    <section id="difficulties" className="py-6 border-t border-border scroll-mt-24">
      <StepHeading index={2} title={sections[1]} icon={TrendingUp} />
      <p className="text-sm text-muted-foreground mb-4">{fr ? 'Vos cinq derniers résultats au maximum par matière, sur les douze dernières semaines. Une note isolée est un premier repère, pas un diagnostic.' : 'Up to five latest results per subject over the last twelve weeks. A single score is an initial signal, not a diagnosis.'}</p>
      {difficulties.length === 0 ? <p className="text-sm">{fr ? 'Encore trop peu de résultats associés à une matière pour identifier une priorité. Votre première évaluation servira de point de départ.' : 'Not enough subject-linked results to identify a priority. Your first assessment will provide a starting point.'}</p> : <div className="divide-y divide-border">
        {difficulties.map(d => <div key={d.subjectId} className="py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0"><h4 className="font-semibold break-words">{d.subject}</h4><p className="text-sm text-muted-foreground">{d.count} {fr ? 'résultat(s)' : 'result(s)'} · {d.count === 1 ? (fr ? 'À confirmer par un autre exercice' : 'Confirm with another exercise') : d.change !== null ? `${d.change >= 0 ? '+' : ''}${d.change} ${fr ? 'points entre premier et dernier résultat retenus' : 'points between first and latest retained result'}` : ''}</p></div>
          <div className="flex items-center gap-3"><span className="font-bold">{d.average}%</span><Badge variant={d.average < 50 ? 'outline' : 'secondary'}>{d.average < 50 ? (fr ? 'Bases à renforcer' : 'Strengthen basics') : d.average < 70 ? (fr ? 'À consolider' : 'Consolidate') : (fr ? 'À entretenir' : 'Maintain')}</Badge></div>
        </div>)}
      </div>}
    </section>

    <section id="next-action" className="py-6 border-t border-border scroll-mt-24">
      <StepHeading index={3} title={sections[2]} icon={ArrowRight} />
      <div className="border-l-4 border-secondary pl-5 space-y-3">
        {action.result && <p className="text-sm text-muted-foreground">{action.result.subject} · {action.result.title} · {fr ? 'Dernier résultat' : 'Latest result'} : {action.result.percent}%</p>}
        <h4 className="text-lg font-semibold">{actionLabel}</h4>
        <p className="text-sm text-muted-foreground">{action.result ? (fr ? 'Cette priorité vient de vos résultats récents. Relisez les points manqués, entraînez-vous, puis vérifiez vos acquis avec une nouvelle évaluation.' : 'This priority comes from your recent results. Review missed points, practise, then check your learning with a new assessment.') : (fr ? 'Choisissez une leçon de votre classe et de votre série. Lisez-la, puis faites un exercice Facile pour situer votre niveau.' : 'Choose a lesson matching your class and series. Read it, then take an Easy exercise to establish your level.')}</p>
        <Button asChild className="h-auto min-h-10 whitespace-normal text-left"><Link to={action.to}>{fr ? 'Commencer cette étape' : 'Start this step'}<ArrowRight className="h-4 w-4 ml-2 shrink-0" /></Link></Button>
        <p className="text-xs text-muted-foreground">{fr ? 'Les conditions d’accès et d’abonnement habituelles restent applicables.' : 'Existing access and subscription conditions still apply.'}</p>
      </div>
    </section>

    <section id="revision-plan" className="py-6 border-t border-border scroll-mt-24">
      <StepHeading index={4} title={fr ? 'Plan de révision jusqu’à l’échéance' : 'Revision plan to your deadline'} icon={CalendarDays} />
      <StudyDeadlineCard userId={userId} />
      {deadline && daysUntil(deadline.date, now) >= 0 && <>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="font-medium">{dateLabel(planStart)} – {dateLabel(addDays(planStart, 6))} · {sessions.filter(s => s.completed).length}/{sessions.length} {fr ? 'séances évaluées réalisées' : 'assessed sessions completed'}</p>
          <div className="flex gap-1"><Button size="icon" variant="outline" disabled={safePlanOffset === 0} aria-label={fr ? 'Plan de la semaine précédente' : 'Previous plan week'} onClick={() => setPlanOffset(safePlanOffset - 1)}><ArrowLeft className="h-4 w-4" /></Button><Button size="icon" variant="outline" disabled={safePlanOffset >= lastPlanOffset} aria-label={fr ? 'Plan de la semaine suivante' : 'Next plan week'} onClick={() => setPlanOffset(safePlanOffset + 1)}><ArrowRight className="h-4 w-4" /></Button></div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{fr ? 'Avant chaque séance : relire le cours et les erreurs précédentes. Ensuite : une évaluation, puis son corrigé. Les résultats enregistrés valident les séances ; le plan se réajuste à vos progrès.' : 'Before each session: review the lesson and previous mistakes. Then: an assessment followed by its correction. Recorded results confirm sessions; the plan adjusts to your progress.'}</p>
        <ol className="divide-y divide-border">
          {sessions.map((s, i) => <li key={`${s.date}-${i}`} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-20 shrink-0 text-sm font-medium">{dateLabel(new Date(`${s.date}T00:00:00`))}</div>
            <div className="flex-1 min-w-0"><p className="font-medium">{s.focus?.subject || (fr ? 'Matière de votre choix' : 'Your chosen subject')}</p><p className="text-sm text-muted-foreground">{s.phase === 'basics' ? (fr ? 'Revoir les bases + exercice Facile' : 'Review basics + Easy exercise') : s.phase === 'practice' ? (fr ? 'Exercice adapté + analyse du corrigé' : 'Adapted exercise + correction review') : (fr ? 'Épreuve chronométrée + bilan des erreurs' : 'Timed paper + review of mistakes')}</p></div>
            {s.completed ? <span className="text-sm text-primary flex items-center gap-1"><CheckCircle2 className="h-4 w-4" />{fr ? 'Évaluation réalisée' : 'Assessment completed'}</span> : <Button asChild variant={s.date <= dateKey(now) ? 'default' : 'outline'} className="self-start shrink-0"><Link to={s.to}>{s.date < dateKey(now) ? (fr ? 'Rattraper' : 'Catch up') : s.date === dateKey(now) ? (fr ? 'Commencer' : 'Start') : (fr ? 'Ouvrir' : 'Open')}<ArrowRight className="h-4 w-4 ml-2" /></Link></Button>}
          </li>)}
        </ol>
        <p className="text-xs text-muted-foreground mt-3">{fr ? 'Les séances supplémentaires d’un même jour demandent des évaluations distinctes. La lecture du corrigé n’est pas encore mesurée.' : 'Extra sessions on the same day require distinct assessments. Reading corrections is not yet measured.'}</p>
      </>}
    </section>
  </div>;
}

function StepHeading({ index, title, icon: Icon }: { index: number; title: string; icon: typeof Target }) {
  return <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-3 mb-4"><span className="text-secondary text-sm shrink-0">0{index}</span><Icon className="h-5 w-5 text-primary shrink-0" /><span>{title}</span></h3>;
}