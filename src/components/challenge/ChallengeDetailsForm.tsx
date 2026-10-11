import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SeriesMultiSelect } from '@/components/ui/series-multi-select';
import { useLanguage } from '@/contexts/LanguageContext';
import ChallengeDocumentField, { challengeDocumentUrl } from './ChallengeDocumentField';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export interface ChallengeFields {
  title: string; description: string | null; starts_at: string | null; ends_at: string;
  duration_minutes: number; graded_out_of: number; scope: string; region: string | null;
  country: string | null; reward: string | null; subject_id: string | null; class_id: string | null;
  eligible_class_ids: string[]; eligible_series_ids: string[] | null; pdf_url: string | null;
}
const dateValue = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export default function ChallengeDetailsForm({ value, onChange, series, classes, subjects, onBusyChange }: {
  value: ChallengeFields; onChange: (patch: Partial<ChallengeFields>) => void;
  series: { id: string; code: string }[]; classes: { id: string; display_name: string }[];
  subjects: { id: string; name: string }[]; onBusyChange: (busy: boolean) => void;
}) {
  const { language } = useLanguage(); const fr = language === 'fr';
  return <div className="space-y-4">
    <div><Label>{fr ? 'Titre' : 'Title'}</Label><Input value={value.title} maxLength={150} onChange={(e) => onChange({ title: e.target.value })} /></div>
    <div><Label>Description</Label><Textarea value={value.description || ''} maxLength={500} onChange={(e) => onChange({ description: e.target.value })} /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><Label>{fr ? 'Date de début' : 'Start date'}</Label><Input aria-label={fr ? 'Date de début' : 'Start date'} type="datetime-local" value={dateValue(value.starts_at)} onChange={(e) => onChange({ starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
      <div><Label>{fr ? 'Date de fin' : 'End date'}</Label><Input aria-label={fr ? 'Date de fin' : 'End date'} type="datetime-local" value={dateValue(value.ends_at)} onChange={(e) => onChange({ ends_at: e.target.value ? new Date(e.target.value).toISOString() : '' })} /></div>
      <div><Label>{fr ? 'Durée (min)' : 'Duration (min)'}</Label><Input type="number" min={5} max={600} value={value.duration_minutes} onChange={(e) => onChange({ duration_minutes: Number(e.target.value) })} /></div>
      <div><Label>{fr ? 'Note sur' : 'Graded out of'}</Label><Input type="number" min={1} max={100} value={value.graded_out_of} onChange={(e) => onChange({ graded_out_of: Number(e.target.value) })} /></div>
      <div><Label>{fr ? 'Matière' : 'Subject'}</Label><Select value={value.subject_id || 'none'} onValueChange={(v) => onChange({ subject_id: v === 'none' ? null : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{fr ? 'Toutes les matières' : 'All subjects'}</SelectItem>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>{fr ? 'Portée' : 'Scope'}</Label><Select value={value.scope === 'inter_class' ? 'establishment' : value.scope} onValueChange={(v) => onChange({ scope: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="establishment">{fr ? 'Établissement' : 'School'}</SelectItem><SelectItem value="regional">{fr ? 'Régional' : 'Regional'}</SelectItem><SelectItem value="national">National</SelectItem></SelectContent></Select></div>
      <div><Label>{fr ? 'Région' : 'Region'}</Label><Input value={value.region || ''} maxLength={100} onChange={(e) => onChange({ region: e.target.value })} /></div>
      <div><Label>{fr ? 'Pays' : 'Country'}</Label><Input value={value.country || ''} maxLength={100} onChange={(e) => onChange({ country: e.target.value })} /></div>
      <div><Label>{fr ? 'Récompense' : 'Reward'}</Label><Input value={value.reward || ''} maxLength={150} onChange={(e) => onChange({ reward: e.target.value })} /></div>
    </div>
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-sm font-semibold">{fr ? 'Cible du challenge' : 'Challenge target'}</p>
      <div><Label>{fr ? 'Classes / niveaux concernés' : 'Classes / levels'}</Label><SeriesMultiSelect options={classes.map((c) => ({ id: c.id, label: c.display_name }))} value={value.eligible_class_ids || []} onChange={(ids) => onChange({ eligible_class_ids: ids, class_id: ids[0] || null })} /></div>
      <div><Label>{fr ? 'Séries / Filières' : 'Series / Tracks'}</Label><SeriesMultiSelect options={series.map((s) => ({ id: s.id, label: s.code }))} value={value.eligible_series_ids || []} onChange={(ids) => onChange({ eligible_series_ids: ids })} /></div>
      <p className="text-xs text-muted-foreground">{fr ? 'Aucune sélection = tous les élèves de la portée choisie.' : 'No selection = all students within the chosen scope.'}</p>
    </div>
    <ChallengeDocumentField value={value.pdf_url || ''} onChange={(pdf_url) => onChange({ pdf_url })} onBusyChange={onBusyChange} />
    {value.pdf_url && <Button type="button" size="sm" variant="outline" onClick={async () => { try { const url = await challengeDocumentUrl(value.pdf_url || ''); window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); } }}><ExternalLink className="mr-2 h-4 w-4" />{fr ? 'Ouvrir le document' : 'Open document'}</Button>}
  </div>;
}