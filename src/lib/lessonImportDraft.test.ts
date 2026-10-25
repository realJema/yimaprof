import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { emptyLessonExercises } from './lessonJsonExercises';
import { stageLessonImport, cancelLessonImport } from './lessonImportDraft';

describe('lesson JSON import rollback', () => {
  const original = { ...emptyLessonExercises(), facile: [
    { question: 'Original', type: 'text', answer: 'A', points: 2 },
  ] };
  const replacement = { ...emptyLessonExercises(), difficile: [
    { question: 'Replacement', type: 'text', answer: 'B', points: 5 },
  ] };
  it('stages validated exercises for saving without dropping them', () => {
    assert.deepEqual(stageLessonImport(null, original, replacement).current, replacement);
  });
  it('cancel restores the complete previous exercises', () => {
    assert.deepEqual(cancelLessonImport(stageLessonImport(null, original, replacement)), original);
  });
  it('repeated validation preserves the original cancellation checkpoint', () => {
    const first = stageLessonImport(null, original, replacement);
    const second = stageLessonImport(first, replacement, emptyLessonExercises());
    assert.deepEqual(cancelLessonImport(second), original);
  });
  it('a new import after confirmation rolls back to the confirmed exercises', () => {
    assert.deepEqual(cancelLessonImport(stageLessonImport(null, replacement, original)), replacement);
  });
});