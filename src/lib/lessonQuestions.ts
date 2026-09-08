/**
 * Questions attached to a lesson. Stored in the `lessons.questions` JSONB column.
 * Prompts, options and answers support Markdown + LaTeX (rendered with MarkdownText).
 */
export type LessonQuestionType = 'mcq' | 'open';

export interface LessonQuestion {
  id: string;
  type: LessonQuestionType;
  prompt: string;
  /** MCQ only */
  options?: string[];
  /** MCQ only: index of the correct option */
  correctIndex?: number;
  /** Open questions: model answer. MCQ: optional explanation. */
  answer?: string;
}

export const newLessonQuestion = (type: LessonQuestionType = 'mcq'): LessonQuestion => ({
  id: (globalThis.crypto?.randomUUID?.() ?? `q-${Date.now()}-${Math.random().toString(36).slice(2)}`),
  type,
  prompt: '',
  options: type === 'mcq' ? ['', ''] : undefined,
  correctIndex: type === 'mcq' ? 0 : undefined,
  answer: '',
});

/** Defensive parsing: the column is free-form JSON. */
export function parseLessonQuestions(value: unknown): LessonQuestion[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((q): q is Record<string, unknown> => !!q && typeof q === 'object')
    .map((q, i) => {
      const type: LessonQuestionType = q.type === 'open' ? 'open' : 'mcq';
      const options = Array.isArray(q.options) ? q.options.map((o) => String(o ?? '')) : undefined;
      return {
        id: typeof q.id === 'string' && q.id ? q.id : `q-${i}`,
        type,
        prompt: typeof q.prompt === 'string' ? q.prompt : '',
        options: type === 'mcq' ? options ?? [] : undefined,
        correctIndex: type === 'mcq' ? Number(q.correctIndex ?? 0) : undefined,
        answer: typeof q.answer === 'string' ? q.answer : '',
      };
    })
    .filter((q) => q.prompt.trim().length > 0);
}
