import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { EyeOff } from 'lucide-react';

/**
 * Wraps sensitive content (papers, lessons, challenges):
 * - blocks selection, drag & drop of images, copy/cut and print shortcuts
 * - hides the content when the tab loses focus (screenshot deterrent)
 * - stamps a discreet watermark with the reader identity so leaks are traceable
 *
 * A system-level screen capture cannot be blocked from a browser; the watermark
 * makes any leaked capture attributable.
 */
export default function ProtectedContent({
  children,
  className,
  watermark = true,
}: {
  children: ReactNode;
  className?: string;
  watermark?: boolean;
}) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === 'hidden');
    const onBlur = () => setHidden(true);
    const onFocus = () => setHidden(false);

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ['c', 'x', 'p', 's', 'u'].includes(key)) {
        e.preventDefault();
      }
      // PrintScreen: cannot be blocked, but we can hide the content right after.
      if (key === 'printscreen') setHidden(true);
    };

    const block = (e: Event) => e.preventDefault();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('dragstart', block);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('dragstart', block);
    };
  }, []);

  const label = user?.email?.split('@')[0] || (fr ? 'Invité' : 'Guest');

  return (
    <div className={cn('relative select-none', className)} onDragStart={(e) => e.preventDefault()}>
      {watermark && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-[0.045]"
        >
          <div className="grid h-full w-full grid-cols-2 place-items-center gap-10 text-xl font-bold -rotate-[24deg]">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="whitespace-nowrap">
                Yimaprof · {label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={cn('transition-all', hidden && 'blur-md')}>{children}</div>

      {hidden && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/80 text-center backdrop-blur-sm">
          <EyeOff className="h-6 w-6 text-muted-foreground" />
          <p className="max-w-xs text-sm text-muted-foreground">
            {fr
              ? 'Contenu masqué : revenez sur cette fenêtre pour continuer la lecture.'
              : 'Content hidden: focus this window again to keep reading.'}
          </p>
        </div>
      )}
    </div>
  );
}
