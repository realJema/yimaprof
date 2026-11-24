import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  accessibleExerciseQuestions,
  countExercises,
  countExerciseQuestions,
  parseLessonExercises,
  totalPoints,
  validateLessonExercisesJson,
  type JsonExercise,
} from './lessonJsonExercises';

const question = (label: string, points = 1) => ({
  question: label,
  type: 'text',
  answer: `Réponse ${label}`,
  points,
});

const grouped: JsonExercise[] = [
  { title: 'Exercice complet', questions: [question('Q1'), question('Q2', 2), question('Q3', 3)] },
  { title: 'Exercice suivant', questions: [question('Q4'), question('Q5')] },
];

describe('lesson exercise question access', () => {
  it('keeps every question of the first exercise for a free account', () => {
    assert.deepEqual(accessibleExerciseQuestions(grouped, false).map((item) => item.question), ['Q1', 'Q2', 'Q3']);
  });

  it('does not include the second exercise for a free account', () => {
    assert.equal(accessibleExerciseQuestions(grouped, false).some((item) => item.question === 'Q4'), false);
  });

  it('returns every question of every exercise for a subscriber', () => {
    assert.deepEqual(accessibleExerciseQuestions(grouped, true).map((item) => item.question), ['Q1', 'Q2', 'Q3', 'Q4', 'Q5']);
  });

  it('preserves the legacy one-question-per-exercise behavior', () => {
    const legacy = [question('Ancienne 1'), question('Ancienne 2')];
    assert.deepEqual(accessibleExerciseQuestions(legacy, false).map((item) => item.question), ['Ancienne 1']);
    assert.deepEqual(accessibleExerciseQuestions(legacy, true).map((item) => item.question), ['Ancienne 1', 'Ancienne 2']);
  });

  it('counts exercises separately from their questions and points', () => {
    const parsed = parseLessonExercises({ facile: grouped, intermediaire: [], difficile: [] });
    assert.equal(countExercises(parsed), 2);
    assert.equal(countExerciseQuestions(parsed), 5);
    assert.equal(totalPoints(parsed.facile), 8);
  });
});

describe('grouped lesson exercise JSON', () => {
  it('validates and preserves a multi-question exercise', () => {
    const result = validateLessonExercisesJson(JSON.stringify({ facile: grouped, intermediaire: [], difficile: [] }), true);
    assert.equal(result.ok, true);
    assert.equal(result.data?.facile[0].questions?.length, 3);
  });

  it('rejects a grouped exercise without questions', () => {
    const result = validateLessonExercisesJson(JSON.stringify({
      facile: [{ title: 'Vide', questions: [] }], intermediaire: [], difficile: [],
    }), true);
    assert.equal(result.ok, false);
    assert.match(result.error || '', /au moins une question/);
  });

  it('identifies the exact invalid question inside an exercise', () => {
    const invalid = [{ title: 'Circuit', questions: [question('Q1'), { ...question('Q2'), answer: '' }] }];
    const result = validateLessonExercisesJson(JSON.stringify({ facile: invalid, intermediaire: [], difficile: [] }), true);
    assert.equal(result.ok, false);
    assert.match(result.error || '', /exercice 1, question 2/);
  });
});
