import { addDays, differenceInCalendarDays, startOfWeek } from 'date-fns';

export const DEADLINE_KINDS = [
  { id: 'seq1', fr: '1ère Séquence', en: '1st Sequence' },
  { id: 'seq2', fr: '2e Séquence', en: '2nd Sequence' },
  { id: 'seq3', fr: '3e Séquence', en: '3rd Sequence' },
  { id: 'seq4', fr: '4e Séquence', en: '4th Sequence' },
  { id: 'seq5', fr: '5e Séquence', en: '5th Sequence' },
  { id: 'seq6', fr: '6e Séquence', en: '6th Sequence' },
  { id: 'bepc', fr: 'BEPC', en: 'BEPC' },
  { id: 'probatoire', fr: 'Probatoire', en: 'Probatoire' },
  { id: 'bac', fr: 'Baccalauréat', en: 'Baccalauréat' },
  { id: 'gce_o', fr: 'GCE O Level', en: 'GCE O Level' },
  { id: 'gce_a', fr: 'GCE A Level', en: 'GCE A Level' },
  { id: 'custom', fr: 'Autre évaluation', en: 'Other assessment' },
];
export type Deadline = { kind: string; label?: string; date: string };
export type StudyResult = {
  id: string; attemptKey: string; date: string; percent: number;
  source: 'exam' | 'lesson'; title: string; subjectId: string | null;
  subject: string; lessonId: string | null; examId: string | null;
  level: string | null; seconds: number;
};
export type Difficulty = { subjectId: string; subject: string; average: number; count: number; change: number | null; latest: StudyResult };
export function daysUntil(date: string, now = new Date()) {
  return differenceInCalendarDays(new Date(`${date}T00:00:00`), now);
}
export function validDeadline(value: unknown): value is Deadline {
  if (!value || typeof value !== 'object') return false;
  const d = value as Deadline;
  if (!DEADLINE_KINDS.some(k => k.id === d.kind) || typeof d.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return false;
  const parsed = new Date(`${d.date}T00:00:00`);
  return Number.isFinite(parsed.getTime()) && dateKey(parsed) === d.date && (d.kind !== 'custom' || (typeof d.label === 'string' && d.label.trim().length > 0 && d.label.length <= 60));
}
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function gradedPercent(score: number | null, possible: number | null): number | null {
  if (score === null || possible === null || !Number.isFinite(score) || !Number.isFinite(possible) || possible <= 0) return null;
  return Math.round(Math.min(100, Math.max(0, score / possible * 100)));
}
export function uniqueResults(results: StudyResult[]) {
  const map = new Map<string, StudyResult>();
  // Latest server row wins for retry duplicates; genuine numbered attempts remain separate.
  [...results].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).forEach(r => {
    if (Number.isFinite(Date.parse(r.date)) && Number.isFinite(r.percent) && r.percent >= 0 && r.percent <= 100) map.set(r.attemptKey, r);
  });
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
}
export function weeklySummary(results: StudyResult[], now: Date, offset = 0) {
  const start = addDays(startOfWeek(now, { weekStartsOn: 1 }), offset * 7);
  const end = addDays(start, 7);
  const selected = uniqueResults(results).filter(r => new Date(r.date) >= start && new Date(r.date) < end && new Date(r.date) <= now);
  return { start, end, results: selected, total: selected.length,
    exams: selected.filter(r => r.source === 'exam').length,
    exercises: selected.filter(r => r.source === 'lesson').length,
    average: selected.length ? Math.round(selected.reduce((s, r) => s + r.percent, 0) / selected.length) : null,
    days: new Set(selected.map(r => dateKey(new Date(r.date)))).size,
  };
}
export function analyzeDifficulties(results: StudyResult[]) {
  const grouped = new Map<string, StudyResult[]>();
  uniqueResults(results).forEach(r => {
    if (!r.subjectId) return;
    const list = grouped.get(r.subjectId) || [];
    if (list.length < 5) grouped.set(r.subjectId, [...list, r]);
  });
  return [...grouped.entries()].map(([subjectId, list]): Difficulty => ({
    subjectId, subject: list[0].subject, latest: list[0], count: list.length,
    average: Math.round(list.reduce((s, r) => s + r.percent, 0) / list.length),
    change: list.length > 1 ? list[0].percent - list[list.length - 1].percent : null,
  })).sort((a, b) => a.average - b.average || a.subjectId.localeCompare(b.subjectId));
}
export type StudyAction = { kind: 'start' | 'review' | 'practice' | 'exam'; to: string; result: StudyResult | null; level: string };
export function nextStudyAction(results: StudyResult[]): StudyAction {
  const all = uniqueResults(results);
  const subjects = analyzeDifficulties(all);
  const target = subjects[0]?.latest || all[0] || null;
  if (!target) return { kind: 'start', to: '/lessons', result: null, level: 'facile' };
  const average = subjects.find(s => s.subjectId === target.subjectId)?.average ?? target.percent;
  const level = average < 50 ? 'facile' : average < 70 ? 'intermediaire' : 'difficile';
  if (target.lessonId) return {
    kind: target.percent < 50 ? 'review' : 'practice',
    to: `/lessons/${target.lessonId}`, result: target,
    // Never jump to Hard from an unmastered Easy level.
    level: target.percent < 50 ? 'facile' : target.level === 'facile' && target.percent >= 70 ? 'intermediaire' : target.level === 'intermediaire' && target.percent >= 70 ? 'difficile' : target.level || level,
  };
  return { kind: average < 50 ? 'review' : 'exam',
    to: `/exams2${target.subjectId ? `?subject=${encodeURIComponent(target.subjectId)}` : ''}`, result: target, level };
}
export type RevisionSession = { date: string; focus: Difficulty | null; phase: 'basics' | 'practice' | 'rehearsal'; to: string; completed: boolean };
export function revisionWeek(results: StudyResult[], deadline: Deadline, weeklyGoal: number, now: Date, offset = 0): RevisionSession[] {
  if (!validDeadline(deadline) || daysUntil(deadline.date, now) < 0) return [];
  const subjects = analyzeDifficulties(results);
  const start = addDays(startOfWeek(now, { weekStartsOn: 1 }), offset * 7);
  const remaining = daysUntil(deadline.date, now);
  const goal = Math.min(21, Math.max(1, Math.round(weeklyGoal)));
  const sessions: RevisionSession[] = [];
  const usedResults = new Set<string>();
  for (let index = 0; index < goal; index++) {
    const day = addDays(start, Math.floor(index * 7 / goal));
    if (dateKey(day) > deadline.date) continue;
    const focus = subjects.length ? subjects[index % subjects.length] : null;
    const distance = daysUntil(deadline.date, day);
    const phase = distance <= 2 ? 'rehearsal' : focus && focus.average < 50 ? 'basics' : remaining > 7 && distance > remaining / 2 ? 'basics' : 'practice';
    const to = focus?.latest.lessonId && phase !== 'rehearsal' ? `/lessons/${focus.latest.lessonId}` : !focus && phase === 'basics' ? '/lessons' : `/exams2${focus ? `?subject=${encodeURIComponent(focus.subjectId)}` : ''}`;
    // Catch-up is valid after the scheduled day, but a result can fulfill only one session.
    const matching = uniqueResults(results).reverse().find(r => !usedResults.has(r.attemptKey) && dateKey(new Date(r.date)) >= dateKey(day) && new Date(r.date) <= now && dateKey(new Date(r.date)) <= deadline.date && (!focus || r.subjectId === focus.subjectId) && (phase !== 'rehearsal' || r.source === 'exam') && (phase === 'rehearsal' || !focus?.latest.lessonId || r.lessonId === focus.latest.lessonId));
    if (matching) usedResults.add(matching.attemptKey);
    sessions.push({ date: dateKey(day), focus, phase, to, completed: !!matching });
  }
  return sessions;
}