export type SimpleAnswer = { questionIndex: number; answer: string };

export interface McqScoreResult {
  correct: number;
  total: number;
  earnedPoints: number;
  totalPoints: number;
  hasLongForm: boolean;
}

/**
 * Scores the MCQ part of an exam content payload.
 * Long-form questions are reported (hasLongForm) so the caller can route them
 * to AI grading; their marks still count in totalPoints.
 */
export function scoreMcqContent(content: unknown, answers: SimpleAnswer[]): McqScoreResult {
  const items: any[] = Array.isArray(content) ? content : ((content as any)?.questions ?? []);
  let correct = 0;
  let total = 0;
  let earnedPoints = 0;
  let totalPoints = 0;
  let hasLongForm = false;
  let questionIndex = 0;

  items.forEach((item: any) => {
    if (item.item_type !== 'question' && item.type !== 'multiple_choice' && item.type !== 'long_form') return;
    const isMcq = item.question_type === 'multiple_choice' || item.type === 'multiple_choice';
    const marks = Number(item.marks ?? 1);
    totalPoints += marks;

    if (isMcq) {
      total += 1;
      const given = answers.find((a) => a.questionIndex === questionIndex);
      const expected = item.answers?.find((a: any) => a.is_correct);
      if (expected && given?.answer === expected.text) {
        correct += 1;
        earnedPoints += marks;
      }
    } else {
      hasLongForm = true;
    }
    questionIndex += 1;
  });

  return {
    correct,
    total,
    earnedPoints: Math.round(earnedPoints * 100) / 100,
    totalPoints,
    hasLongForm,
  };
}
