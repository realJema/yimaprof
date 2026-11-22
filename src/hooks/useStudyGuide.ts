import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { gradedPercent, StudyResult, uniqueResults } from '@/lib/studyGuide';
import { startOfWeek, subWeeks } from 'date-fns';

type Subject = { id: string; name: string; name_fr: string | null; name_en: string | null };
type Content = { title: string; subjects: Subject | null };
type ExamRow = { id: string; exam_id: string; lesson_id: string | null; attempt_number: number; completed_at: string | null; created_at: string; total_score: number | null; total_possible: number | null; mcq_score: number | null; mcq_total: number | null; time_spent_seconds: number | null; exams: Content | null; lessons: Content | null };
type LessonRow = { id: string; lesson_id: string; level: string; percent: number; created_at: string; lessons: Content | null };
export function useStudyGuide(userId: string | undefined, language: 'fr' | 'en') {
  return useQuery({ queryKey: ['study-guide', userId, language], enabled: !!userId, staleTime: 0,
    queryFn: async (): Promise<StudyResult[]> => {
      if (!userId) return [];
      const since = startOfWeek(subWeeks(new Date(), 11), { weekStartsOn: 1 }).toISOString();
      // Page every result, rather than silently truncating at Supabase's 1,000 rows.
      async function load(kind: 'exam' | 'lesson') {
        const rows: unknown[] = [];
        for (let page = 0; ; page++) {
          const request = kind === 'exam'
            ? supabase.from('user_evaluations').select('id, exam_id, lesson_id, attempt_number, completed_at, created_at, total_score, total_possible, mcq_score, mcq_total, time_spent_seconds, exams(title, subjects(id, name, name_fr, name_en)), lessons(title, subjects(id, name, name_fr, name_en))').eq('user_id', userId).gte('completed_at', since).order('completed_at', { ascending: false }).order('id')
            : supabase.from('lesson_exercise_results').select('id, lesson_id, level, percent, created_at, lessons(title, subjects(id, name, name_fr, name_en))').eq('user_id', userId).gte('created_at', since).order('created_at', { ascending: false }).order('id');
          const { data, error } = await request.range(page * 500, page * 500 + 499);
          if (error) throw error;
          rows.push(...(data || []));
          if (!data || data.length < 500) return rows;
        }
      }
      const [exams, lessons] = await Promise.all([load('exam'), load('lesson')]);
      const subjectName = (s: Subject | null | undefined) => (language === 'fr' ? s?.name_fr : s?.name_en) || s?.name || (language === 'fr' ? 'Matière non renseignée' : 'Subject not specified');
      const results: StudyResult[] = [];
      (exams as ExamRow[]).forEach(r => {
        const percent = gradedPercent(r.total_score, r.total_possible) ?? gradedPercent(r.mcq_score, r.mcq_total);
        if (percent === null || !r.completed_at) return;
        const subject = r.exams?.subjects || r.lessons?.subjects;
        results.push({ id: r.id, attemptKey: `exam:${r.exam_id}:${r.lesson_id || ''}:${r.attempt_number}`, date: r.completed_at, percent, source: 'exam', title: r.exams?.title || r.lessons?.title || (language === 'fr' ? 'Épreuve' : 'Paper'), subjectId: subject?.id || null, subject: subjectName(subject), lessonId: r.lessons ? r.lesson_id : null, examId: r.exams ? r.exam_id : null, level: null, seconds: r.time_spent_seconds || 0 });
      });
      (lessons as LessonRow[]).forEach(r => {
        results.push({ id: r.id, attemptKey: `lesson:${r.id}`, date: r.created_at, percent: r.percent, source: 'lesson', title: r.lessons?.title || (language === 'fr' ? 'Leçon' : 'Lesson'), subjectId: r.lessons?.subjects?.id || null, subject: subjectName(r.lessons?.subjects), lessonId: r.lessons ? r.lesson_id : null, examId: null, level: r.level, seconds: 0 });
      });
      return uniqueResults(results);
    },
  });
}