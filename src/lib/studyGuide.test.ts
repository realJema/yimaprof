import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { analyzeDifficulties, daysUntil, DEADLINE_KINDS, gradedPercent, nextStudyAction, revisionWeek, StudyResult, uniqueResults, validDeadline, weeklySummary } from './studyGuide';

const now = new Date('2026-11-22T12:00:00');
function result(id: string, percent = 40, date = '2026-11-18T12:00:00', patch: Partial<StudyResult> = {}): StudyResult {
  return { id, attemptKey: id, date, percent, source: 'lesson', title: 'Fractions', subjectId: 'math', subject: 'Mathématiques', lessonId: 'lesson-1', examId: null, level: 'facile', seconds: 0, ...patch };
}
describe('Learning guide in requested order', () => {
  it('weekly review counts submitted graded papers and lesson exercises separately', () => {
    const s = weeklySummary([result('a'), result('b', 80, undefined, { source: 'exam' }), result('old', 10, '2026-11-15T12:00:00')], now);
    assert.deepEqual([s.total, s.exams, s.exercises, s.average], [2, 1, 1, 60]);
  });
  it('weeks start on Monday and exclude the next Monday', () => {
    const s = weeklySummary([result('a', 0, '2026-11-16T00:00:00'), result('b', 50, '2026-11-23T00:00:00')], now);
    assert.equal(s.total, 1); assert.equal(s.average, 0);
  });
  it('includes genuine zero scores but excludes absent and ungraded scores', () => {
    assert.equal(gradedPercent(0, 20), 0); assert.equal(gradedPercent(null, 20), null); assert.equal(gradedPercent(10, 0), null);
    assert.equal(uniqueResults([result('bad', NaN)]).length, 0);
  });
  it('deduplicates retry rows, not genuine separate numbered attempts', () => {
    const rows = [result('a', 40, undefined, { attemptKey: 'exam:1:1' }), result('b', 60, '2026-11-19T12:00:00', { attemptKey: 'exam:1:1' }), result('c', 80, undefined, { attemptKey: 'exam:1:2' })];
    assert.equal(uniqueResults(rows).length, 2); assert.equal(uniqueResults(rows).find(r => r.id === 'b')?.percent, 60);
  });
  it('retains more than 1000 results without a computation cap', () => {
    assert.equal(weeklySummary(Array.from({ length: 1100 }, (_, i) => result(String(i))), now).total, 1100);
  });
  it('analyses only the latest five results per identified subject', () => {
    const rows = Array.from({ length: 6 }, (_, i) => result(String(i), i === 0 ? 0 : 80, `2026-11-${String(16 + i).padStart(2, '0')}T12:00:00`));
    const d = analyzeDifficulties(rows)[0]; assert.equal(d.count, 5); assert.equal(d.average, 80);
  });
  it('prioritises the weakest subject across lesson and paper results', () => {
    const d = analyzeDifficulties([result('a', 80), result('b', 30, undefined, { subjectId: 'physics', source: 'exam' })]);
    assert.equal(d[0].subjectId, 'physics'); assert.equal(nextStudyAction([result('a', 80), result('b', 30, undefined, { subjectId: 'physics', lessonId: null, source: 'exam' })]).to, '/exams2?subject=physics');
  });
  it('without results recommends choosing a lesson, not an invented diagnosis', () => {
    assert.equal(analyzeDifficulties([]).length, 0); assert.equal(nextStudyAction([]).kind, 'start'); assert.equal(nextStudyAction([]).to, '/lessons');
  });
  it('recommends rebuilding basics after a difficult-level failure', () => {
    const a = nextStudyAction([result('a', 30, undefined, { level: 'difficile' })]);
    assert.equal(a.kind, 'review'); assert.equal(a.level, 'facile'); assert.equal(a.to, '/lessons/lesson-1');
  });
  it('does not skip from mastered Easy to Hard', () => {
    assert.equal(nextStudyAction([result('a', 95)]).level, 'intermediaire');
  });
  it('supports all six sequences and a named personal assessment', () => {
    for (let i = 1; i <= 6; i++) assert.equal(validDeadline({ kind: `seq${i}`, date: '2026-12-01' }), true);
    assert.equal(DEADLINE_KINDS.filter(k => k.id.startsWith('seq')).length, 6);
    assert.equal(validDeadline({ kind: 'custom', date: '2026-12-01', label: 'Contrôle de maths' }), true);
    assert.equal(validDeadline({ kind: 'custom', date: '2026-12-01', label: ' ' }), false);
  });
  it('rejects invalid calendar dates and computes calendar-day countdowns', () => {
    assert.equal(validDeadline({ kind: 'seq1', date: '2026-02-31' }), false); assert.equal(daysUntil('2026-11-29', now), 7);
  });
  it('plans through but never beyond the deadline, and never after a past deadline', () => {
    const deadline = { kind: 'seq1', date: '2026-11-24' };
    const sessions = revisionWeek([], deadline, 3, now, 1);
    assert.equal(sessions.length, 1); assert.equal(sessions[0].date, '2026-11-23');
    assert.equal(revisionWeek([], { ...deadline, date: '2026-11-21' }, 3, now).length, 0);
  });
  it('uses the learners weekly goal to schedule each full week', () => {
    assert.equal(revisionWeek([], { kind: 'seq2', date: '2026-12-15' }, 5, now, 1).length, 5);
  });
  it('validates catch-up with recorded results, never reusing one result for several sessions', () => {
    const sessions = revisionWeek([result('a', 40, '2026-11-22T10:00:00')], { kind: 'seq2', date: '2026-12-15' }, 21, now);
    assert.equal(sessions.filter(s => s.completed).length, 1);
  });
  it('future sessions cannot be validated by results from earlier dates', () => {
    const sessions = revisionWeek([result('a')], { kind: 'seq2', date: '2026-12-15' }, 3, now, 1);
    assert.equal(sessions.some(s => s.completed), false);
  });
});