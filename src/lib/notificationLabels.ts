const LABELS: Record<string, { fr: string; en: string }> = {
  subscription_expiry: { fr: 'Abonnement', en: 'Subscription' },
  payment_confirmed: { fr: 'Paiement confirmé', en: 'Payment confirmed' },
  admin_message: { fr: "Message de l'équipe", en: 'Team message' },
  account_activity: { fr: 'Activité du compte', en: 'Account activity' },
};

const PRIORITY: Record<string, { fr: string; en: string }> = {
  high: { fr: 'Important', en: 'Important' },
  normal: { fr: 'Normal', en: 'Normal' },
  low: { fr: 'Faible', en: 'Low' },
};

export const notificationTypeLabel = (type: string, lang: string) =>
  (LABELS[type] ?? { fr: 'Notification', en: 'Notification' })[lang === 'en' ? 'en' : 'fr'];

export const notificationPriorityLabel = (p: string, lang: string) =>
  (PRIORITY[p] ?? PRIORITY.normal)[lang === 'en' ? 'en' : 'fr'];

/** Strips technical identifiers (snake_case tokens, table names, raw JSON) from text. */
export const cleanNotificationText = (text: string) =>
  (text || '')
    .replace(/\{[^{}]*"[^"]+"\s*:[^{}]*\}/g, '')
    .replace(/\b[a-z]+(?:_[a-z0-9]+)+\b/g, (m) => (LABELS[m] ? m.replace(/_/g, ' ') : ''))
    .replace(/\s{2,}/g, ' ')
    .trim();
