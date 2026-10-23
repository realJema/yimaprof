// Maps a payment failure to clear, reassuring, action-oriented guidance.
// Never exposes raw provider/technical details to the user.

export type PaymentCarrier = 'MTN' | 'ORANGE' | null;

export type PaymentFailureKind =
  | 'insufficient_balance'
  | 'limit_reached'
  | 'balance_or_limit'
  | 'cancelled'
  | 'operator_rejected'
  | 'expired'
  | 'network'
  | 'unknown';

export interface PaymentFailureGuidance {
  kind: PaymentFailureKind;
  title: string;
  message: string;
  steps: string[];
  canRetry: boolean;
  suggestVerify: boolean;
  suggestSupport: boolean;
}

const USSD: Record<'MTN' | 'ORANGE', string> = {
  MTN: '*126#',
  ORANGE: '#150*50#',
};

export function ussdCode(carrier: PaymentCarrier): string | null {
  return carrier ? USSD[carrier] : null;
}

export function classifyPaymentFailure(reason: string | null | undefined): PaymentFailureKind {
  if (!reason) return 'unknown';
  const text = reason.toLowerCase();

  // Provider messages like "Either the balance is low, or the payee has
  // reached its limit or it is not allowed" are ambiguous: never pretend
  // we know which cause it was.
  const mentionsBalance = /solde|balance|insufficient|insuffisant|fonds/.test(text);
  const mentionsLimit = /limite|limit|plafond|maximum/.test(text);
  if (mentionsBalance && mentionsLimit) return 'balance_or_limit';

  if (mentionsBalance) return 'insufficient_balance';
  if (/limite|limit|plafond|maximum/.test(text)) return 'limit_reached';
  if (/annul|cancel|abandon/.test(text)) return 'cancelled';
  if (/rejet|reject|refus|denied|declin/.test(text)) return 'operator_rejected';
  if (/expir|timeout|délai|delai|timed?\s*out/.test(text)) return 'expired';
  if (/réseau|reseau|network|connexion|indisponible|unavailable/.test(text)) return 'network';
  return 'unknown';
}

export function paymentFailureGuidance(
  reason: string | null | undefined,
  carrier: PaymentCarrier,
): PaymentFailureGuidance {
  const kind = classifyPaymentFailure(reason);
  const ussd = ussdCode(carrier);
  const operator = carrier === 'MTN' ? 'MTN Mobile Money' : carrier === 'ORANGE' ? 'Orange Money' : 'votre opérateur';

  switch (kind) {
    case 'insufficient_balance':
      return {
        kind,
        title: 'Solde insuffisant',
        message: `Votre compte ${operator} ne dispose pas du montant nécessaire pour ce paiement. Aucun montant n'a été débité.`,
        steps: [
          `Vérifiez le solde de votre compte ${operator}.`,
          'Rechargez votre compte du montant de l’abonnement, en pensant aux petits frais de transaction.',
          'Relancez ensuite le paiement en toute sécurité.',
        ],
        canRetry: true,
        suggestVerify: false,
        suggestSupport: false,
      };
    case 'limit_reached':
      return {
        kind,
        title: 'Limite de transaction atteinte',
        message: `Votre compte ${operator} a atteint une limite de transaction (montant ou nombre d’opérations). Aucun montant n'a été débité.`,
        steps: [
          'Patientez jusqu’au lendemain, le temps que la limite journalière se réinitialise.',
          `Ou contactez ${operator} pour connaître et ajuster vos plafonds.`,
          'Vous pourrez ensuite relancer le paiement.',
        ],
        canRetry: true,
        suggestVerify: false,
        suggestSupport: false,
      };
    case 'cancelled':
      return {
        kind,
        title: 'Paiement annulé',
        message: 'La confirmation a été annulée sur le téléphone. Aucun montant n’a été débité.',
        steps: [
          'Relancez le paiement quand vous êtes prêt.',
          ...(ussd ? [`Composez ${ussd} pour valider la demande sur votre téléphone.`] : []),
          'Saisissez votre code secret Mobile Money pour confirmer.',
        ],
        canRetry: true,
        suggestVerify: false,
        suggestSupport: false,
      };
    case 'operator_rejected':
      return {
        kind,
        title: 'Paiement refusé par l’opérateur',
        message: `${operator} n’a pas accepté la transaction. Aucun montant n’a été débité.`,
        steps: [
          'Vérifiez que le numéro utilisé est bien actif et à votre nom.',
          'Assurez-vous que votre compte Mobile Money n’est pas temporairement bloqué.',
          'Réessayez dans quelques minutes ; si le refus persiste, contactez votre opérateur.',
        ],
        canRetry: true,
        suggestVerify: false,
        suggestSupport: true,
      };
    case 'expired':
      return {
        kind,
        title: 'Demande expirée',
        message: 'La demande de confirmation a expiré avant d’être validée sur le téléphone. Aucun montant n’a été débité.',
        steps: [
          'Gardez votre téléphone à portée de main pendant le paiement.',
          ...(ussd ? [`Dès la notification, composez ${ussd} pour valider rapidement.`] : []),
          'Relancez le paiement et confirmez dans le délai indiqué.',
        ],
        canRetry: true,
        suggestVerify: false,
        suggestSupport: false,
      };
    case 'network':
      return {
        kind,
        title: 'Problème de connexion',
        message: 'La communication avec le service de paiement a été interrompue. Si vous avez déjà confirmé sur votre téléphone, vérifiez avant de réessayer.',
        steps: [
          'Vérifiez votre connexion internet.',
          'Si vous avez confirmé sur votre téléphone, utilisez « Vérifier mon paiement » plutôt que de relancer.',
          'Sinon, relancez le paiement en toute sécurité.',
        ],
        canRetry: true,
        suggestVerify: true,
        suggestSupport: false,
      };
    default:
      return {
        kind: 'unknown',
        title: 'Paiement non confirmé',
        message: 'Le paiement n’a pas pu être confirmé. Si vous avez déjà validé sur votre téléphone, vérifiez avant toute nouvelle tentative.',
        steps: [
          'Si vous avez confirmé sur votre téléphone, utilisez « Vérifier mon paiement ».',
          'Sinon, vous pouvez relancer le paiement en toute sécurité.',
          'Si le problème persiste, notre support est à votre disposition.',
        ],
        canRetry: true,
        suggestVerify: true,
        suggestSupport: true,
      };
  }
}
