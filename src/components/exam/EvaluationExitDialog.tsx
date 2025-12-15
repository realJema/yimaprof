import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface EvaluationExitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmExit: () => void;
}

export function EvaluationExitDialog({ 
  open, 
  onOpenChange, 
  onConfirmExit 
}: EvaluationExitDialogProps) {
  const { language } = useLanguage();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {language === 'fr' ? 'Quitter l\'évaluation ?' : 'Exit Evaluation?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {language === 'fr' 
              ? 'Êtes-vous sûr de vouloir quitter ? Votre progression sera perdue.'
              : 'Are you sure you want to exit? Your progress will be lost.'
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {language === 'fr' ? 'Continuer' : 'Continue'}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {language === 'fr' ? 'Quitter' : 'Exit'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
