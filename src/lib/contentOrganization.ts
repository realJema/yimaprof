export function lessonClassIds(lesson: { class_ids?: string[]; class_id?: string | null }): string[] {
  return lesson.class_ids?.length ? lesson.class_ids : lesson.class_id ? [lesson.class_id] : [];
}
export function challengeEnded(endsAt: string, now = Date.now()): boolean {
  return new Date(endsAt).getTime() <= now;
}