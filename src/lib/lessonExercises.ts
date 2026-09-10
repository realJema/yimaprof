/**
 * Lesson exercises: every lesson organises its practice content in three
 * difficulty buckets. An exercise is either created inside the lesson
 * (origin 'lesson') or an existing exam linked to it (origin 'linked').
 * Both are stored as rows in `lesson_exercises` pointing at an `exams` row,
 * so the student-facing experience is the regular exam experience.
 */
export type LessonLevel = 'easy' | 'intermediate' | 'difficult';

export const LESSON_LEVELS: LessonLevel[] = ['easy', 'intermediate', 'difficult'];

export const levelLabel = (level: LessonLevel, fr: boolean) =>
  level === 'easy'
    ? fr ? 'Facile' : 'Easy'
    : level === 'intermediate'
      ? fr ? 'Intermédiaire' : 'Intermediate'
      : fr ? 'Difficile' : 'Difficult';

/** Legacy rows used other labels (e.g. 'basic'); everything unknown is "easy". */
export const normalizeLevel = (value: unknown): LessonLevel =>
  value === 'intermediate' || value === 'difficult' ? value : 'easy';

/** Exams created inside a lesson are hidden from the exam library. */
export const LESSON_EXAM_VISIBILITY = 'lesson';

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `i-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export interface ExerciseAnswer {
  id: string;
  text: string;
  is_correct: boolean;
  rubric?: Array<{ criteria: string; points: number }>;
}

export interface ExerciseItem {
  id: string;
  item_type: 'heading' | 'instruction' | 'passage' | 'question';
  question_type?: 'multiple_choice' | 'long_form';
  text: string;
  marks?: number;
  order: number;
  answers?: ExerciseAnswer[];
  explanatory_note?: string;
}

export const newMcqItem = (order: number): ExerciseItem => ({
  id: uid(),
  item_type: 'question',
  question_type: 'multiple_choice',
  text: '',
  marks: 2,
  order,
  explanatory_note: '',
  answers: [
    { id: uid(), text: '', is_correct: true },
    { id: uid(), text: '', is_correct: false },
    { id: uid(), text: '', is_correct: false },
    { id: uid(), text: '', is_correct: false },
  ],
});

export const newLongFormItem = (order: number): ExerciseItem => ({
  id: uid(),
  item_type: 'question',
  question_type: 'long_form',
  text: '',
  marks: 5,
  order,
  explanatory_note: '',
  answers: [{ id: uid(), text: '', is_correct: true, rubric: [] }],
});

export const newTextItem = (
  order: number,
  item_type: 'heading' | 'instruction' | 'passage',
): ExerciseItem => ({ id: uid(), item_type, text: '', order });

/** Defensive parsing: `exams.content` is free-form JSON. */
export function parseExerciseContent(value: unknown): ExerciseItem[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as { questions?: unknown[] }).questions)
      ? (value as { questions: unknown[] }).questions
      : [];
  return (list as Record<string, unknown>[])
    .filter((i) => !!i && typeof i === 'object')
    .map((i, index) => ({
      ...(i as unknown as ExerciseItem),
      id: typeof i.id === 'string' && i.id ? i.id : `i-${index}`,
      order: Number(i.order ?? index + 1),
    }));
}

export const countQuestions = (items: ExerciseItem[]) =>
  items.filter((i) => i.item_type === 'question').length;

export const totalMarks = (items: ExerciseItem[]) =>
  items.filter((i) => i.item_type === 'question').reduce((sum, i) => sum + (Number(i.marks) || 0), 0);
