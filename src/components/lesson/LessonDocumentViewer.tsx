import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import ProtectedContent from '@/components/security/ProtectedContent';
import { resolveLessonDoc } from '@/lib/lessonDocs';
import { AlertTriangle, BookOpen, Maximize2, Minimize2 } from 'lucide-react';

/**
 * Read-only viewer for lesson documents hosted outside the app.
 * No source/download links are offered. The sandbox denies downloads, popups
 * and top-level navigation; it is not DRM and cannot conceal the network URL.
 *
 * No overlay sits on top of the iframe: a transparent shield blocks the wheel
 * and touch gestures of a cross-origin document, which made the lesson
 * impossible to scroll. Copy/print shortcuts and right-click are still blocked
 * around the frame by ProtectedContent.
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

  const resolved = resolveLessonDoc(fileUrl);
  const src = embedUrl || resolved?.embedUrl || null;

  useEffect(() => {
    setFailed(false);
    setExpanded(false);
  }, [src]);

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
    <section className="lesson-reading-content min-w-0 select-none" aria-label={fr ? 'Cours' : 'Course'} onContextMenu={(e) => e.preventDefault()}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 mb-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <BookOpen className="h-5 w-5 text-primary" />
          {fr ? 'Le cours' : 'Course material'}
        </h2>
        <Button variant="ghost" size="sm" aria-expanded={expanded} aria-controls="lesson-document-frame" onClick={() => setExpanded((v) => !v)}>
          {expanded ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
          {expanded ? (fr ? 'Réduire' : 'Reduce') : fr ? 'Agrandir' : 'Expand'}
        </Button>
      </div>
      <ProtectedContent watermark={false} hideOnBlur={false} hideOnTabChange className="rounded-lg border border-border overflow-hidden bg-muted/30">
        <div id="lesson-document-frame" className={expanded ? 'relative w-full h-[85vh] min-h-80' : 'relative w-full h-[70vh] min-h-80'}>
          <iframe
            src={src}
            title={title || (fr ? 'Document de la leçon' : 'Lesson document')}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            allow="clipboard-read 'none'; clipboard-write 'none'; display-capture 'none'"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setFailed(true)}
          />
          {/* Drive exposes an external-open control in this corner. Mask only
              that control, never the reading surface or its scroll gestures.
              Cross-origin text selection cannot be controlled by this page. */}
          {resolved?.provider === 'google' && (
            <div aria-hidden="true" className="absolute right-0 top-0 h-14 w-16 bg-card" onContextMenu={(e) => e.preventDefault()} />
          )}
        </div>
      </ProtectedContent>
    </section>
  );
}
