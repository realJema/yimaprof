export type SimpleAnswer = { questionIndex: number; answer: string };

export interface McqScoreResult {
  correct: number;
  total: number;
  earnedPoints: number;
  totalPoints: number;
  hasLongForm: boolean;
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Keyword / rubric based scoring for a written answer.
 * Mirrors the exam viewer heuristic so challenges grade written answers too.
 */
export function scoreLongForm(studentAnswer: string, expectedAnswer: any, maxPoints: number): number {
  if (!studentAnswer || !expectedAnswer) return 0;
  const studentNorm = normalize(studentAnswer);

  if (Array.isArray(expectedAnswer.rubric) && expectedAnswer.rubric.length > 0) {
    let earned = 0;
    let rubricTotal = 0;
    for (const criterion of expectedAnswer.rubric) {
      const points = Number(criterion.points ?? 0);
      rubricTotal += points;
      const keywords = normalize(String(criterion.criteria ?? ''))
        .split(' ')
        .filter((w) => w.length > 3);
      if (!keywords.length) continue;
      const matchCount = keywords.filter((kw) => studentNorm.includes(kw)).length;
      earned += points * (matchCount / keywords.length);
    }
    if (rubricTotal > 0) return (earned / rubricTotal) * maxPoints;
    return earned;
  }

  if (expectedAnswer.text) {
    const expectedWords = [
      ...new Set(
        normalize(String(expectedAnswer.text))
          .split(' ')
          .filter((w) => w.length > 3),
      ),
    ];
    if (!expectedWords.length) return 0;
    const matchCount = expectedWords.filter((w) => studentNorm.includes(w)).length;
    return (matchCount / expectedWords.length) * maxPoints;
  }

  return 0;
}

/**
 * Scores an exam content payload: MCQ by exact match, written answers by
 * keyword/rubric matching so their marks are never silently lost.
 * hasLongForm is reported so callers can refine with AI grading afterwards.
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

    const given = answers.find((a) => a.questionIndex === questionIndex);

    if (isMcq) {
      total += 1;
      const expected = item.answers?.find((a: any) => a.is_correct);
      if (expected && given?.answer === expected.text) {
        correct += 1;
        earnedPoints += marks;
      }
    } else {
      hasLongForm = true;
      if (given?.answer && item.answers?.[0]) {
        earnedPoints += scoreLongForm(given.answer, item.answers[0], marks);
      }
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
