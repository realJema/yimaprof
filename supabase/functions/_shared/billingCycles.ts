export const BILLING_CYCLES = ['daily', 'weekly', 'monthly', 'trimester', 'annual'] as const;
export type BillingCycle = typeof BILLING_CYCLES[number];
export function parseBillingCycle(value: unknown): BillingCycle | null {
  if (value == null || value === '') return 'monthly';
  return BILLING_CYCLES.includes(value as BillingCycle) ? value as BillingCycle : null;
}
export function billingPrice(plan: { price: number; price_daily?: number | null; price_weekly?: number | null; price_trimester?: number | null; price_annual?: number | null }, cycle: BillingCycle): number | null {
  const price = cycle === 'monthly' ? plan.price : plan[`price_${cycle}`];
  return typeof price === 'number' && Number.isInteger(price) && price > 0 ? price : null;
}
export function billingDays(cycle: BillingCycle, base: number): number {
  return cycle === 'daily' ? 1 : cycle === 'weekly' ? 7 : cycle === 'trimester' ? base * 3 : cycle === 'annual' ? base * 9 : base;
}
export function billingLabel(cycle: BillingCycle, fr: boolean): string {
  const labels = { daily: ['Par jour', 'Daily'], weekly: ['Par semaine', 'Weekly'], monthly: ['Mensuel', 'Monthly'], trimester: ['Trimestriel', 'Trimester'], annual: ['Annuel', 'Annual'] };
  return labels[cycle][fr ? 0 : 1];
}