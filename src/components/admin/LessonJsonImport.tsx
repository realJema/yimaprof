import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  JSON_LEVELS,
  LessonExercises,
  countExercises,
  jsonLevelLabel,
  validateLessonExercisesJson,
} from '@/lib/lessonJsonExercises';
import { AlertTriangle, CheckCircle2, Upload } from 'lucide-react';

/**
 * Step 3 of the lesson form: paste or import the exercises JSON.
 * Nothing is applied to the lesson until the JSON validates.
 */
export default function LessonJsonImport({
  value,
  onChange,
}: {
  value: LessonExercises;
  onChange: (next: LessonExercises) => void;
}) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const fileRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<LessonExercises | null>(null);

  const validate = () => {
    const result = validateLessonExercisesJson(text, fr);
    if (!result.ok) {
      setPending(null);
      setError(result.error!);
      return;
    }
    setError(null);
    setPending(result.data!);
  };

  const pickFile = async (file: File | null) => {
    if (!file) return;
    const content = await file.text();
    setText(content);
    setPending(null);
    setError(null);
  };

  const apply = () => {
    if (!pending) return;
    onChange(pending);
    setPending(null);
    setText('');
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="lesson-json">{fr ? 'JSON des exercices' : 'Exercises JSON'}</Label>
        <Textarea
          id="lesson-json"
          rows={10}
          className="font-mono text-xs mt-1"
          placeholder='{"facile": [...], "intermediaire": [...], "difficile": [...]}'
          value={text}
          onChange={(e) => { setText(e.target.value); setPending(null); setError(null); }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          {fr ? 'Importer un fichier .json' : 'Import a .json file'}
        </Button>
        <Button type="button" size="sm" onClick={validate} disabled={!text.trim()}>
          {fr ? 'Valider le JSON' : 'Validate JSON'}
        </Button>
        {pending && (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPending(null)}>
              {fr ? 'Annuler' : 'Cancel'}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={apply}>
              {fr ? 'Importer / Enregistrer' : 'Import / Save'}
            </Button>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {pending && (
        <div className="rounded-lg border border-secondary/40 bg-secondary/5 p-3 space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-secondary" />
            {fr ? 'JSON valide — aperçu avant enregistrement' : 'Valid JSON — preview before saving'}
          </p>
          <div className="flex flex-wrap gap-2">
            {JSON_LEVELS.map((lv) => (
              <Badge key={lv} variant="outline">
                {jsonLevelLabel(lv, fr)} : {pending[lv].length}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border p-3">
        <p className="text-sm font-medium mb-2">
          {fr ? 'Exercices actuellement enregistrés' : 'Exercises currently saved'} ({countExercises(value)})
        </p>
        <div className="flex flex-wrap gap-2">
          {JSON_LEVELS.map((lv) => (
            <Badge key={lv} variant={value[lv].length ? 'secondary' : 'outline'}>
              {jsonLevelLabel(lv, fr)} : {value[lv].length}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
