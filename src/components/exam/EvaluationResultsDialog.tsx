import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Trophy, Target, Clock, RotateCcw, CheckCircle, XCircle, Eye, Award, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatGrade } from '@/lib/grading';

interface AiFeedbackItem {
  questionIndex: number;
  score: number;
  maxPoints: number;
  feedback: string;
}

interface EvaluationResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: { correct: number; total: number; earnedPoints?: number; totalPoints?: number } | null;
  hasMcq: boolean;
  timeSpentSeconds: number;
  attemptNumber: number;
  onRetry: () => void;
  onClose: () => void;
  onViewAnswers: () => void;
  aiGrading?: boolean;
  aiFeedback?: AiFeedbackItem[] | null;
}

export function EvaluationResultsDialog({
  open,
  onOpenChange,
  score,
  hasMcq,
  timeSpentSeconds,
  attemptNumber,
  onRetry,
  onClose,
  onViewAnswers,
  aiGrading = false,
  aiFeedback = null,
}: EvaluationResultsDialogProps) {
  const { language } = useLanguage();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasFullScore = score && typeof score.earnedPoints === 'number' && typeof score.totalPoints === 'number' && score.totalPoints > 0;
  const percentage = hasFullScore 
    ? Math.round((score.earnedPoints! / score.totalPoints!) * 100) 
    : (score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0);

  // Grades are absolute (out of 20 by default); the percentage stays secondary.
  const grade = hasFullScore
    ? formatGrade(score!.earnedPoints, score!.totalPoints)
    : formatGrade(score?.correct ?? 0, score?.total ?? 0);
  
  const getScoreColor = () => {
    if (percentage >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (percentage >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreIcon = () => {
    if (percentage >= 80) return Trophy;
    if (percentage >= 60) return CheckCircle;
    return XCircle;
  };

  const ScoreIcon = getScoreIcon();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            {language === 'fr' ? 'Évaluation Terminée' : 'Evaluation Complete'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          {(hasMcq || hasFullScore) && score ? (
            <div className="space-y-6">
              {/* Score Circle */}
              <div className="flex justify-center">
                <div className={cn(
                  "relative w-32 h-32 rounded-full border-4 flex items-center justify-center",
                  percentage >= 80 && "border-emerald-500/50 bg-emerald-500/10",
                  percentage >= 60 && percentage < 80 && "border-amber-500/50 bg-amber-500/10",
                  percentage < 60 && "border-red-500/50 bg-red-500/10"
                )}>
                  <div className="text-center">
                    {aiGrading ? (
                      <>
                        <Loader2 className="h-8 w-8 mx-auto mb-1 text-primary animate-spin" />
                        <span className="text-xs text-muted-foreground">
                          {language === 'fr' ? 'Correction...' : 'Grading...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <ScoreIcon className={cn("h-8 w-8 mx-auto mb-1", getScoreColor())} />
                        <span className={cn("text-3xl font-bold", getScoreColor())}>
                          {percentage}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Grading indicator */}
              {aiGrading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {language === 'fr' 
                    ? "Correction en cours..." 
                    : 'Grading in progress...'}
                </div>
              )}

              {/* Stats */}
              <div className={cn("grid gap-4 text-center", hasFullScore && hasMcq ? "grid-cols-2" : "grid-cols-3")}>
                {hasFullScore && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <Award className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-semibold">{score.earnedPoints}/{score.totalPoints}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'fr' ? 'Score total' : 'Total Score'}
                    </p>
                  </div>
                )}
                
                {hasMcq && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-semibold">{score.correct}/{score.total}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'fr' ? 'QCM' : 'MCQ'}
                    </p>
                  </div>
                )}
                
                <div className="bg-muted/50 rounded-lg p-3">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-semibold">{formatTime(timeSpentSeconds)}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'fr' ? 'Temps' : 'Time'}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <RotateCcw className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-semibold">#{attemptNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'fr' ? 'Tentative' : 'Attempt'}
                  </p>
                </div>
              </div>

              {/* AI Feedback per question */}
              {aiFeedback && aiFeedback.length > 0 && (
                <Collapsible open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {language === 'fr' ? 'Détails de la correction' : 'Grading Details'}
                      {feedbackOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 mt-2">
                      {aiFeedback.map((item, idx) => (
                        <div key={idx} className="bg-muted/50 rounded-lg p-3 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">
                              {language === 'fr' ? `Question ${item.questionIndex + 1}` : `Question ${item.questionIndex + 1}`}
                            </span>
                            <span className={cn(
                              "font-semibold",
                              item.score >= item.maxPoints * 0.8 ? "text-emerald-600 dark:text-emerald-400" :
                              item.score >= item.maxPoints * 0.5 ? "text-amber-600 dark:text-amber-400" :
                              "text-red-600 dark:text-red-400"
                            )}>
                              {item.score}/{item.maxPoints}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{item.feedback}</p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="bg-muted/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <DialogDescription className="text-base">
                {language === 'fr' 
                  ? 'Cette épreuve ne contient pas de questions à noter automatiquement. Veuillez revoir vos réponses avec la correction.'
                  : 'This exam has no questions to score automatically. Please review your answers with the correction.'
                }
              </DialogDescription>
              
              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div className="bg-muted/50 rounded-lg p-3">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-semibold">{formatTime(timeSpentSeconds)}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'fr' ? 'Temps' : 'Time'}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <RotateCcw className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-semibold">#{attemptNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'fr' ? 'Tentative' : 'Attempt'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onViewAnswers} className="gap-2 w-full sm:w-auto">
            <Eye className="h-4 w-4" />
            {language === 'fr' ? 'Voir les réponses' : 'View Answers'}
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onRetry} className="gap-2 flex-1 sm:flex-none">
              <RotateCcw className="h-4 w-4" />
              {language === 'fr' ? 'Réessayer' : 'Retry'}
            </Button>
            <Button onClick={onClose} className="flex-1 sm:flex-none">
              {language === 'fr' ? 'Fermer' : 'Close'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
