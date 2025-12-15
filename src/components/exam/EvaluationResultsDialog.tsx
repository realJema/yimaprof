import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Trophy, Target, Clock, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvaluationResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: { correct: number; total: number } | null;
  hasMcq: boolean;
  timeSpentSeconds: number;
  attemptNumber: number;
  onRetry: () => void;
  onClose: () => void;
}

export function EvaluationResultsDialog({
  open,
  onOpenChange,
  score,
  hasMcq,
  timeSpentSeconds,
  attemptNumber,
  onRetry,
  onClose
}: EvaluationResultsDialogProps) {
  const { language } = useLanguage();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            {language === 'fr' ? 'Évaluation Terminée' : 'Evaluation Complete'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          {hasMcq && score ? (
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
                    <ScoreIcon className={cn("h-8 w-8 mx-auto mb-1", getScoreColor())} />
                    <span className={cn("text-3xl font-bold", getScoreColor())}>
                      {percentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-muted/50 rounded-lg p-3">
                  <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-semibold">{score.correct}/{score.total}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'fr' ? 'Correct' : 'Correct'}
                  </p>
                </div>
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
          ) : (
            <div className="text-center py-4">
              <div className="bg-muted/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <DialogDescription className="text-base">
                {language === 'fr' 
                  ? 'Cette épreuve ne contient pas de QCM à noter automatiquement. Veuillez revoir vos réponses avec la correction.'
                  : 'This exam has no MCQ questions to score automatically. Please review your answers with the correction.'
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {language === 'fr' ? 'Réessayer' : 'Retry'}
          </Button>
          <Button onClick={onClose}>
            {language === 'fr' ? 'Fermer' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
