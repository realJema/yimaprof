import { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface EvaluationTimerProps {
  totalSeconds: number;
  /**
   * Optional initial value for remaining seconds (used for session resume).
   * If omitted, defaults to totalSeconds.
   */
  initialSeconds?: number;
  isPaused: boolean;
  onTimeUp: () => void;
  onTick?: (remainingSeconds: number) => void;
}

export function EvaluationTimer({
  totalSeconds,
  initialSeconds,
  isPaused,
  onTimeUp,
  onTick,
}: EvaluationTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(() => initialSeconds ?? totalSeconds);
  const { language } = useLanguage();

  // Keep internal timer in sync when starting/resuming an evaluation.
  useEffect(() => {
    setRemainingSeconds(initialSeconds ?? totalSeconds);
  }, [initialSeconds, totalSeconds]);

  useEffect(() => {
    if (isPaused || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const newValue = prev - 1;
        onTick?.(newValue);
        if (newValue <= 0) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, remainingSeconds, onTimeUp, onTick]);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const percentRemaining = (remainingSeconds / totalSeconds) * 100;
  
  // Color states: green > 25%, yellow 10-25%, red < 10%
  const getTimerState = () => {
    if (percentRemaining <= 10) return 'critical';
    if (percentRemaining <= 25) return 'warning';
    return 'normal';
  };

  const timerState = getTimerState();

  return (
    <div 
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-lg font-mono text-lg font-semibold transition-colors",
        timerState === 'normal' && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        timerState === 'warning' && "bg-amber-500/20 text-amber-600 dark:text-amber-400",
        timerState === 'critical' && "bg-red-500/20 text-red-600 dark:text-red-400 animate-pulse"
      )}
    >
      {timerState === 'critical' ? (
        <AlertTriangle className="h-5 w-5" />
      ) : (
        <Clock className="h-5 w-5" />
      )}
      <span>{formatTime(remainingSeconds)}</span>
      {isPaused && (
        <span className="text-sm font-normal ml-2">
          ({language === 'fr' ? 'En pause' : 'Paused'})
        </span>
      )}
    </div>
  );
}
