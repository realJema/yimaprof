import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Pause, Play, X, Send } from 'lucide-react';

interface EvaluationControlsProps {
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onExit: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

export function EvaluationControls({ 
  isPaused, 
  onPause, 
  onResume, 
  onExit, 
  onSubmit,
  canSubmit
}: EvaluationControlsProps) {
  const { language } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      {isPaused ? (
        <Button 
          onClick={onResume} 
          variant="outline" 
          size="sm"
          className="gap-2 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
        >
          <Play className="h-4 w-4" />
          {language === 'fr' ? 'Reprendre' : 'Resume'}
        </Button>
      ) : (
        <Button 
          onClick={onPause} 
          variant="outline" 
          size="sm"
          className="gap-2 bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
        >
          <Pause className="h-4 w-4" />
          {language === 'fr' ? 'Pause' : 'Pause'}
        </Button>
      )}
      
      <Button 
        onClick={onExit} 
        variant="outline" 
        size="sm"
        className="gap-2 bg-red-500/10 border-red-500/30 text-red-600 hover:bg-red-500/20 dark:text-red-400"
      >
        <X className="h-4 w-4" />
        {language === 'fr' ? 'Quitter' : 'Exit'}
      </Button>
      
      <Button 
        onClick={onSubmit} 
        size="sm"
        disabled={!canSubmit}
        className="gap-2"
      >
        <Send className="h-4 w-4" />
        {language === 'fr' ? 'Soumettre' : 'Submit'}
      </Button>
    </div>
  );
}
