import { describe, expect, it } from 'vitest';
import {
  classifyPaymentFailure,
  paymentFailureGuidance,
  ussdCode,
} from './paymentFailureGuidance';

describe('classifyPaymentFailure', () => {
  it('detects insufficient balance in French and English', () => {
    expect(classifyPaymentFailure('MeSomb status: FAILED - solde insuffisant')).toBe('insufficient_balance');
    expect(classifyPaymentFailure('Insufficient funds')).toBe('insufficient_balance');
  });

  it('detects limit reached', () => {
    expect(classifyPaymentFailure('Limite journalière atteinte')).toBe('limit_reached');
    expect(classifyPaymentFailure('Transaction limit exceeded')).toBe('limit_reached');
  });

  it('detects user cancellation', () => {
    expect(classifyPaymentFailure('Paiement annulé par l’utilisateur')).toBe('cancelled');
    expect(classifyPaymentFailure('User cancelled the request')).toBe('cancelled');
  });

  it('detects operator rejection', () => {
    expect(classifyPaymentFailure('Transaction rejetée par l’opérateur')).toBe('operator_rejected');
    expect(classifyPaymentFailure('Request rejected')).toBe('operator_rejected');
  });

  it('detects expiry and timeout', () => {
    expect(classifyPaymentFailure('La demande a expiré')).toBe('expired');
    expect(classifyPaymentFailure('Request timeout')).toBe('expired');
  });

  it('detects network issues', () => {
    expect(classifyPaymentFailure('Erreur réseau')).toBe('network');
    expect(classifyPaymentFailure('Service unavailable')).toBe('network');
  });

  it('falls back to unknown for empty or unrecognized reasons', () => {
    expect(classifyPaymentFailure(null)).toBe('unknown');
    expect(classifyPaymentFailure('')).toBe('unknown');
    expect(classifyPaymentFailure('MeSomb status: FAILED')).toBe('unknown');
  });
});

describe('paymentFailureGuidance', () => {
  it('never exposes the raw technical reason in user-facing text', () => {
    const guidance = paymentFailureGuidance('MeSomb status: FAILED - solde insuffisant', 'MTN');
    const visible = [guidance.title, guidance.message, ...guidance.steps].join(' ');
    expect(visible).not.toContain('MeSomb');
    expect(visible).not.toContain('FAILED');
  });

  it('reassures that no debit occurred for insufficient balance', () => {
    const guidance = paymentFailureGuidance('solde insuffisant', 'ORANGE');
    expect(guidance.message).toContain('Aucun montant');
    expect(guidance.message).toContain('Orange Money');
    expect(guidance.canRetry).toBe(true);
  });

  it('includes the carrier USSD code in cancellation steps', () => {
    const mtn = paymentFailureGuidance('annulé', 'MTN');
    expect(mtn.steps.some(step => step.includes('*126#'))).toBe(true);
    const orange = paymentFailureGuidance('annulé', 'ORANGE');
    expect(orange.steps.some(step => step.includes('#150*50#'))).toBe(true);
  });

  it('suggests verification before retry when a debit may have happened', () => {
    const network = paymentFailureGuidance('Erreur réseau', 'MTN');
    expect(network.suggestVerify).toBe(true);
    const unknown = paymentFailureGuidance(null, null);
    expect(unknown.suggestVerify).toBe(true);
  });

  it('suggests support only for persistent or unclear failures', () => {
    expect(paymentFailureGuidance('rejeté', 'MTN').suggestSupport).toBe(true);
    expect(paymentFailureGuidance('solde insuffisant', 'MTN').suggestSupport).toBe(false);
  });

  it('omits USSD steps when the carrier is unknown', () => {
    const guidance = paymentFailureGuidance('annulé', null);
    expect(guidance.steps.every(step => !step.includes('*126#') && !step.includes('#150*50#'))).toBe(true);
  });
});

describe('ussdCode', () => {
  it('returns the carrier code or null', () => {
    expect(ussdCode('MTN')).toBe('*126#');
    expect(ussdCode('ORANGE')).toBe('#150*50#');
    expect(ussdCode(null)).toBeNull();
  });
});
