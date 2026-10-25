import type { LessonExercises } from './lessonJsonExercises';

export interface LessonImportDraft {
  previous: LessonExercises;
  current: LessonExercises;
}

export function stageLessonImport(
  draft: LessonImportDraft | null,
  value: LessonExercises,
  next: LessonExercises,
): LessonImportDraft {
  return { previous: draft?.previous ?? value, current: next };
}

export function cancelLessonImport(draft: LessonImportDraft): LessonExercises {
  return draft.previous;
}