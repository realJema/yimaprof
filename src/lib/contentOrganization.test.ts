import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { lessonClassIds, challengeEnded } from './contentOrganization';
import { billingDays, billingPrice, parseBillingCycle } from '../../supabase/functions/_shared/billingCycles';
describe('Requested course and billing rules', () => {
  it('retains all assigned lesson classes', () => assert.deepEqual(lessonClassIds({ class_id: 'a', class_ids: ['a', 'b'] }), ['a', 'b']));
  it('retains the primary class for old lessons', () => assert.deepEqual(lessonClassIds({ class_id: 'a' }), ['a']));
  it('releases challenge results only at the end date', () => {
    assert.equal(challengeEnded('2026-11-08T20:00:00Z', Date.parse('2026-11-08T19:59:59Z')), false);
    assert.equal(challengeEnded('2026-11-08T20:00:00Z', Date.parse('2026-11-08T20:00:00Z')), true);
  });
  it('daily access lasts one day', () => assert.equal(billingDays('daily', 30), 1));
  it('weekly access lasts seven days', () => assert.equal(billingDays('weekly', 30), 7));
  it('preserves all existing durations', () => assert.deepEqual(['monthly', 'trimester', 'annual'].map(c => billingDays(c as 'monthly' | 'trimester' | 'annual', 30)), [30, 90, 270]));
  it('does not offer daily prices before admin configuration', () => assert.equal(billingPrice({ price: 2500 }, 'daily'), null));
  it('does not offer weekly prices before admin configuration', () => assert.equal(billingPrice({ price: 2500, price_weekly: 0 }, 'weekly'), null));
  it('uses the recorded short-cycle price, not a monthly calculation', () => assert.equal(billingPrice({ price: 2500, price_daily: 150 }, 'daily'), 150));
  it('rejects unknown cycles rather than charging monthly', () => assert.equal(parseBillingCycle('bad'), null));
});