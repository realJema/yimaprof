import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { Clock, Target, Maximize2, BookOpen } from 'lucide-react';

interface EvaluationRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: () => void;
  durationMinutes: number;
  attemptCount: number;
}

export function EvaluationRulesDialog({ 
  open, 
  onOpenChange, 
  onStart, 
  durationMinutes,
  attemptCount 
}: EvaluationRulesDialogProps) {
  const { language, t } = useLanguage();

  const rules = [
    {
      icon: Clock,
      title: language === 'fr' ? 'Session Chronométrée' : 'Timed Session',
      description: language === 'fr' 
        ? `Vous aurez ${durationMinutes} minutes pour compléter cette évaluation.`
        : `You will have ${durationMinutes} minutes to complete this evaluation.`
    },
    {
      icon: Maximize2,
      title: language === 'fr' ? 'Mode Plein Écran' : 'Full Screen Mode',
      description: language === 'fr'
        ? 'L\'évaluation se déroulera en mode plein écran pour une concentration optimale.'
        : 'The evaluation will run in full screen mode for optimal focus.'
    },
    {
      icon: Target,
      title: language === 'fr' ? 'Score QCM Uniquement' : 'MCQ Scoring Only',
      description: language === 'fr'
        ? 'Seules les questions à choix multiples seront notées automatiquement.'
        : 'Only multiple choice questions will be automatically scored.'
    },
    {
      icon: BookOpen,
      title: language === 'fr' ? 'Pause Disponible' : 'Pause Available',
      description: language === 'fr'
        ? 'Vous pouvez mettre en pause ou quitter à tout moment.'
        : 'You can pause or exit at any time.'
    }
  ];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">
            {language === 'fr' ? 'Règles de l\'Évaluation' : 'Evaluation Rules'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              {attemptCount > 0 && (
                <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm">
                  {language === 'fr' 
                    ? `Vous avez déjà effectué ${attemptCount} tentative${attemptCount > 1 ? 's' : ''} sur cette épreuve.`
                    : `You have already made ${attemptCount} attempt${attemptCount > 1 ? 's' : ''} on this exam.`
                  }
                </div>
              )}
              
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="bg-primary/10 rounded-lg p-2 mt-0.5">
                      <rule.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{rule.title}</p>
                      <p className="text-muted-foreground text-sm">{rule.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel>
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onStart} className="gap-2">
            {language === 'fr' ? 'Commencer l\'Évaluation' : 'Start Evaluation'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
