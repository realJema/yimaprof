import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  classifyPaymentFailure,
  paymentFailureGuidance,
  ussdCode,
} from './paymentFailureGuidance';

describe('classifyPaymentFailure', () => {
  it('detects insufficient balance in French and English', () => {
    assert.equal(classifyPaymentFailure('MeSomb status: FAILED - solde insuffisant'), 'insufficient_balance');
    assert.equal(classifyPaymentFailure('Insufficient funds'), 'insufficient_balance');
  });

  it('detects limit reached', () => {
    assert.equal(classifyPaymentFailure('Limite journalière atteinte'), 'limit_reached');
    assert.equal(classifyPaymentFailure('Transaction limit exceeded'), 'limit_reached');
  });

  it('treats the ambiguous provider message as balance-or-limit, never a single cause', () => {
    const ambiguous = 'Either the balance is low, or the payee has reached its limit or it is not allowed';
    assert.equal(classifyPaymentFailure(ambiguous), 'balance_or_limit');
    assert.equal(
      classifyPaymentFailure(`MeSomb status: FAILED - ${ambiguous}`),
      'balance_or_limit',
    );
  });

  it('detects user cancellation', () => {
    assert.equal(classifyPaymentFailure('Paiement annulé par l’utilisateur'), 'cancelled');
    assert.equal(classifyPaymentFailure('User cancelled the request'), 'cancelled');
  });

  it('detects operator rejection', () => {
    assert.equal(classifyPaymentFailure('Transaction rejetée par l’opérateur'), 'operator_rejected');
    assert.equal(classifyPaymentFailure('Request rejected'), 'operator_rejected');
  });

  it('detects expiry and timeout', () => {
    assert.equal(classifyPaymentFailure('La demande a expiré'), 'expired');
    assert.equal(classifyPaymentFailure('Request timeout'), 'expired');
  });

  it('detects network issues', () => {
    assert.equal(classifyPaymentFailure('Erreur réseau'), 'network');
    assert.equal(classifyPaymentFailure('Service unavailable'), 'network');
  });

  it('falls back to unknown for empty or unrecognized reasons', () => {
    assert.equal(classifyPaymentFailure(null), 'unknown');
    assert.equal(classifyPaymentFailure(''), 'unknown');
    assert.equal(classifyPaymentFailure('MeSomb status: FAILED'), 'unknown');
  });
});

describe('paymentFailureGuidance', () => {
  it('never exposes the raw technical reason in user-facing text', () => {
    const guidance = paymentFailureGuidance('MeSomb status: FAILED - solde insuffisant', 'MTN');
    const visible = [guidance.title, guidance.message, ...guidance.steps].join(' ');
    assert.ok(!visible.includes('MeSomb'));
    assert.ok(!visible.includes('FAILED'));
  });

  it('reassures that no debit occurred for insufficient balance', () => {
    const guidance = paymentFailureGuidance('solde insuffisant', 'ORANGE');
    assert.ok(guidance.message.includes('Aucun montant'));
    assert.ok(guidance.message.includes('Orange Money'));
    assert.equal(guidance.canRetry, true);
  });

  it('covers both causes without claiming one for the ambiguous message', () => {
    const guidance = paymentFailureGuidance(
      'Either the balance is low, or the payee has reached its limit or it is not allowed',
      'MTN',
    );
    assert.equal(guidance.kind, 'balance_or_limit');
    const visible = [guidance.title, guidance.message, ...guidance.steps].join(' ');
    assert.ok(visible.includes('solde'));
    assert.ok(visible.includes('limite'));
    assert.ok(visible.includes('Aucun montant'));
    assert.ok(visible.includes('MTN Mobile Money'));
  });

  it('includes the carrier USSD code in cancellation steps', () => {
    const mtn = paymentFailureGuidance('annulé', 'MTN');
    assert.ok(mtn.steps.some(step => step.includes('*126#')));
    const orange = paymentFailureGuidance('annulé', 'ORANGE');
    assert.ok(orange.steps.some(step => step.includes('#150*50#')));
  });

  it('suggests verification before retry when a debit may have happened', () => {
    const network = paymentFailureGuidance('Erreur réseau', 'MTN');
    assert.equal(network.suggestVerify, true);
    const unknown = paymentFailureGuidance(null, null);
    assert.equal(unknown.suggestVerify, true);
  });

  it('suggests support only for persistent or unclear failures', () => {
    assert.equal(paymentFailureGuidance('rejeté', 'MTN').suggestSupport, true);
    assert.equal(paymentFailureGuidance('solde insuffisant', 'MTN').suggestSupport, false);
  });

  it('omits USSD steps when the carrier is unknown', () => {
    const guidance = paymentFailureGuidance('annulé', null);
    assert.ok(guidance.steps.every(step => !step.includes('*126#') && !step.includes('#150*50#')));
  });
});

describe('ussdCode', () => {
  it('returns the carrier code or null', () => {
    assert.equal(ussdCode('MTN'), '*126#');
    assert.equal(ussdCode('ORANGE'), '#150*50#');
    assert.equal(ussdCode(null), null);
  });
});
