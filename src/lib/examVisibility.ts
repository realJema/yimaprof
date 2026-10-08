/**
 * Single source of truth for exam visibility rules.
 * - 'lesson'  : created from a lesson, only reachable from the lesson page.
 * - 'free'    : fully open (statement, correction, self-evaluation).
 * - anything else in the library requires a qualifying subscription.
 */
export const LIBRARY_EXAM_VISIBILITIES = ['public', 'free'] as const;
export const FREE_EXAM_VISIBILITIES = ['free'] as const;

export const isLessonOnlyExam = (v?: string | null) => v === 'lesson';
export const isFreeExam = (v?: string | null) =>
  (FREE_EXAM_VISIBILITIES as readonly string[]).includes(v ?? '');
