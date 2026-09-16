import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import ProtectedContent from '@/components/security/ProtectedContent';
import { resolveLessonDoc } from '@/lib/lessonDocs';
import { AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';

/**
 * Read-only viewer for lesson documents hosted outside the app.
 * Downloads are intentionally not offered and the iframe is sandboxed without
 * `allow-downloads`, so the document can be read but not saved from the page.
 *
 * A transparent shield sits above the cross-origin iframe so the document
 * cannot be selected or copied with the mouse. Scroll/wheel gestures are
 * passed through to the iframe, and touch-only devices keep native scrolling.
 */
export default function LessonDocumentViewer({
  fileUrl,
  embedUrl,
  title,
}: {
  fileUrl: string | null;
  embedUrl?: string | null;
  title?: string;
}) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const shieldRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const restoreTimer = useRef<number | null>(null);

  // Touch-only devices scroll natively; the shield would block swipes,
  // so it only guards mouse-driven environments.
  const [touchOnly] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches
  );

  useEffect(
    () => () => {
      if (restoreTimer.current !== null) window.clearTimeout(restoreTimer.current);
    },
    []
  );

  /** Temporarily let events reach the iframe so gestures scroll it. */
  const passThrough = () => {
    if (touchOnly || !shieldRef.current) return;
    shieldRef.current.style.pointerEvents = 'none';
    if (restoreTimer.current !== null) window.clearTimeout(restoreTimer.current);
    restoreTimer.current = window.setTimeout(() => {
      if (shieldRef.current) shieldRef.current.style.pointerEvents = 'auto';
    }, 350);
  };

  const resolved = resolveLessonDoc(fileUrl);
  const src = embedUrl || resolved?.embedUrl || null;

  if (!src) return null;

  if (failed) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-2">
          <AlertTriangle className="h-7 w-7 mx-auto text-muted-foreground" />
          <p className="font-medium">{fr ? 'Document indisponible' : 'Document unavailable'}</p>
          <p className="text-sm text-muted-foreground">
            {fr
              ? "L'aperçu n'a pas pu être chargé. Réessayez plus tard."
              : 'The preview could not be loaded. Please try again later.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2 select-none">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
          {expanded ? (fr ? 'Réduire' : 'Reduce') : fr ? 'Agrandir' : 'Expand'}
        </Button>
      </div>
      <ProtectedContent watermark={false} hideOnBlur={false} className="rounded-lg border border-border overflow-hidden bg-card">
        <div className={expanded ? 'relative w-full h-[85vh]' : 'relative w-full h-[70vh]'}>
          <iframe
            ref={iframeRef}
            src={src}
            title={title || (fr ? 'Document de la leçon' : 'Lesson document')}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setFailed(true)}
          />
          <div
            ref={shieldRef}
            aria-hidden="true"
            className="absolute inset-0 z-10"
            style={{ pointerEvents: touchOnly ? 'none' : 'auto' }}
            onWheel={(e) => {
              // Swallow the first tick (it would scroll the page instead of
              // the document), then let the rest of the gesture reach the doc.
              e.preventDefault();
              passThrough();
            }}
            onContextMenu={(e) => e.preventDefault()}
            onDoubleClick={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              // Hand focus to the document so arrow keys can scroll it.
              try {
                iframeRef.current?.contentWindow?.focus();
              } catch {
                /* cross-origin focus is best-effort */
              }
            }}
          />
        </div>
      </ProtectedContent>
    </div>
  );
}
