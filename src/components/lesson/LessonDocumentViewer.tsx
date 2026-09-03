import { useState } from 'react';
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
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
          {expanded ? (fr ? 'Réduire' : 'Reduce') : fr ? 'Agrandir' : 'Expand'}
        </Button>
      </div>
      <ProtectedContent className="rounded-lg border border-border overflow-hidden bg-card">
        <iframe
          src={src}
          title={title || (fr ? 'Document de la leçon' : 'Lesson document')}
          className={expanded ? 'w-full h-[85vh] border-0' : 'w-full h-[70vh] border-0'}
          sandbox="allow-scripts allow-same-origin allow-popups"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </ProtectedContent>
    </div>
  );
}
