import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { isValidHttpUrl, providerLabel, resolveLessonDoc } from '@/lib/lessonDocs';
import { Eye, EyeOff, FileText, Info } from 'lucide-react';

/**
 * Word-document link input used both in the admin lesson manager and in the
 * school content form. Documents live outside the app: we only keep the link.
 */
export default function LessonDocumentField({
  value,
  onChange,
  id = 'lesson-doc-url',
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [preview, setPreview] = useState(false);

  const doc = useMemo(() => resolveLessonDoc(value), [value]);
  const invalid = value.trim().length > 0 && !isValidHttpUrl(value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        {fr ? 'Lien du document Word' : 'Word document link'}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder="https://docs.google.com/document/d/.../preview"
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
      />
      {invalid && (
        <p className="text-xs text-destructive">
          {fr ? 'Adresse invalide (elle doit commencer par https://).' : 'Invalid URL (it must start with https://).'}
        </p>
      )}
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        {fr
          ? 'Hébergez le document sur Google Drive, OneDrive ou Dropbox et partagez-le en lecture pour « tout le monde disposant du lien », sinon l’aperçu restera vide.'
          : 'Host the document on Google Drive, OneDrive or Dropbox and share it as “anyone with the link can view”, otherwise the preview stays empty.'}
      </p>

      {doc && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{providerLabel(doc.provider, fr)}</Badge>
          <Button type="button" variant="outline" size="sm" onClick={() => setPreview((v) => !v)}>
            {preview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {preview ? (fr ? 'Masquer l’aperçu' : 'Hide preview') : fr ? 'Tester l’aperçu' : 'Test preview'}
          </Button>
        </div>
      )}

      {preview && doc?.embedUrl && (
        <iframe
          src={doc.embedUrl}
          title={fr ? 'Aperçu du document' : 'Document preview'}
          className="w-full h-72 rounded-lg border border-border"
          sandbox="allow-scripts allow-same-origin allow-popups"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
