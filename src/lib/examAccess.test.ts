import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isEvaluationLocked } from './examAccess';

describe('isEvaluationLocked', () => {
  it('locks guests', () => {
    assert.equal(
      isEvaluationLocked({ isAuthenticated: false, isFreeUser: true, hasAccess: false }),
      true,
    );
  });

  it('locks non-subscribers even on free exams', () => {
    assert.equal(
      isEvaluationLocked({ isAuthenticated: true, isFreeUser: true, hasAccess: false }),
      true,
    );
  });

  it('unlocks subscribers', () => {
    assert.equal(
      isEvaluationLocked({ isAuthenticated: true, isFreeUser: false, hasAccess: true }),
      false,
    );
  });

  it('unlocks admins (hasAccess without subscription flags)', () => {
    assert.equal(
      isEvaluationLocked({ isAuthenticated: true, isFreeUser: false, hasAccess: true }),
      false,
    );
  });
});
