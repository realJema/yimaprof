/**
 * Access rule for exam self-evaluation (auto-évaluation).
 *
 * - Guests: always locked.
 * - Users without a qualifying subscription (isFreeUser && !hasAccess): locked,
 *   including on free exams. Free exams keep their statement and correction
 *   open, but the timed, graded self-evaluation requires an active subscription.
 * - Subscribers and admins (hasAccess): unlocked.
 */
export interface EvaluationAccessInput {
  isAuthenticated: boolean;
  isFreeUser: boolean;
  hasAccess: boolean;
}

export const isEvaluationLocked = ({
  isAuthenticated,
  isFreeUser,
  hasAccess,
}: EvaluationAccessInput): boolean => !isAuthenticated || (isFreeUser && !hasAccess);
