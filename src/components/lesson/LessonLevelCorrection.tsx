import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarkdownText } from '@/components/ui/markdown-text';
import { useLanguage } from '@/contexts/LanguageContext';
import { JsonExercise, isMcqExercise } from '@/lib/lessonJsonExercises';

/** Read-only corrected version of a lesson level: no input, no timer, no score. */
export default function LessonLevelCorrection({ exercises }: { exercises: JsonExercise[] }) {
  const { language } = useLanguage();
  const fr = language === 'fr';

  return (
    <div className="space-y-3">
      {exercises.map((ex, index) => (
        <Card key={index}>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <MarkdownText text={`**${index + 1}.** ${ex.question}`} />
              <Badge variant="outline" className="shrink-0">{ex.points} pt</Badge>
            </div>
            {isMcqExercise(ex) && (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {ex.options!.map((option) => (
                  <li key={option} className={option === ex.answer ? 'font-medium text-foreground' : ''}>
                    • {option}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm">
              <span className="text-muted-foreground">{fr ? 'Bonne réponse : ' : 'Correct answer: '}</span>
              <span className="font-medium">{ex.answer}</span>
            </p>
            {ex.correction && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <MarkdownText text={ex.correction} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
