import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, Loader2, ExternalLink } from 'lucide-react';

export async function challengeDocumentUrl(value: string) {
  if (!value.startsWith('storage:')) return value;
  const { data, error } = await supabase.storage.from('challenge-documents').createSignedUrl(value.slice(8), 300);
  if (error) throw error;
  return data.signedUrl;
}

export default function ChallengeDocumentField({ value, onChange, onBusyChange }: { value: string; onChange: (value: string) => void; onBusyChange?: (busy: boolean) => void }) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [mode, setMode] = useState<'pdf' | 'link'>(value.startsWith('https:') ? 'link' : 'pdf');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const upload = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 10 * 1024 * 1024) { setError(fr ? 'Choisissez un PDF de 10 Mo maximum.' : 'Choose a PDF no larger than 10 MB.'); return; }
    setBusy(true); onBusyChange?.(true);
    try {
      const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
      if (signature !== '%PDF-') throw new Error(fr ? 'Ce fichier n’est pas un PDF valide.' : 'This is not a valid PDF.');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(fr ? 'Connectez-vous pour charger le PDF.' : 'Sign in to upload the PDF.');
      const path = `${user.id}/${crypto.randomUUID()}.pdf`;
      const { error } = await supabase.storage.from('challenge-documents').upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (error) throw error;
      onChange(`storage:${path}`);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); onBusyChange?.(false); }
  };
  return (
    <div className="space-y-2">
      <Label>{fr ? 'Document du challenge' : 'Challenge document'}</Label>
      <div className="flex gap-2"><Button type="button" size="sm" variant={mode === 'pdf' ? 'default' : 'outline'} onClick={() => setMode('pdf')}><FileText className="mr-2 h-4 w-4" />PDF</Button><Button type="button" size="sm" variant={mode === 'link' ? 'default' : 'outline'} onClick={() => setMode('link')}><ExternalLink className="mr-2 h-4 w-4" />Google Drive</Button></div>
      {mode === 'pdf' ? <><Input aria-label={fr ? 'Charger le PDF' : 'Upload PDF'} type="file" accept=".pdf,application/pdf" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} /><p className="text-xs text-muted-foreground">{fr ? 'PDF uniquement · 10 Mo maximum · document privé' : 'PDF only · maximum 10 MB · private document'}</p>{value.startsWith('storage:') && <p className="text-sm text-accent">{fr ? 'PDF chargé' : 'PDF uploaded'}</p>}</> : <><Input aria-label="Google Drive" type="url" value={value.startsWith('storage:') ? '' : value} onChange={(e) => onChange(e.target.value)} placeholder="https://drive.google.com/file/d/..." /><p className="text-xs text-muted-foreground">{fr ? 'Partagez le document en lecture avec toute personne disposant du lien.' : 'Share the document read-only with anyone who has the link.'}</p></>}
      {busy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}