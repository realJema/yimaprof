import { useState } from 'react';
import { CalendarClock, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudyPreferences } from '@/hooks/useStudyPreferences';
import { DEADLINE_KINDS, Deadline, daysUntil, validDeadline } from '@/lib/studyGuide';
import { useToast } from '@/hooks/use-toast';

export { DEADLINE_KINDS, daysUntil } from '@/lib/studyGuide';

export default function StudyDeadlineCard({ userId }: { userId?: string }) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const { toast } = useToast();
  const { deadline, save: savePreferences, saving, isPending, isError, refetch } = useStudyPreferences(userId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Deadline>({ kind: 'seq1', label: '', date: '' });

  const failure = () => toast({ title: isEn ? 'Deadline not saved' : 'Échéance non enregistrée', description: isEn ? 'Check your connection and try again.' : 'Vérifiez votre connexion et réessayez.', variant: 'destructive' });
  const save = async () => {
    if (!validDeadline(form)) return;
    try {
      await savePreferences({ deadline_kind: form.kind, deadline_label: form.label?.trim() || null, deadline_date: form.date });
      setEditing(false);
    } catch { failure(); }
  };
  const remove = async () => {
    try { await savePreferences({ deadline_kind: null, deadline_label: null, deadline_date: null }); }
    catch { failure(); }
  };

  const kind = DEADLINE_KINDS.find(k => k.id === deadline?.kind);
  const name = deadline?.kind === 'custom' && deadline.label ? deadline.label : kind ? (isEn ? kind.en : kind.fr) : '';
  const days = deadline ? daysUntil(deadline.date) : 0;
  if (!userId) return null;
  if (isPending) return <p className="text-sm text-muted-foreground py-4">{isEn ? 'Loading your deadline…' : 'Chargement de votre échéance…'}</p>;
  if (isError) return <Button variant="outline" onClick={() => void refetch()}>{isEn ? 'Retry loading deadline' : 'Recharger mon échéance'}</Button>;

  return (
    <Card className="mb-8 border-border/50 bg-card/95 shadow-soft">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-secondary/15 p-2.5 text-secondary"><CalendarClock className="h-5 w-5" /></div>
          <div className="flex-1">
            <p className="font-semibold">{isEn ? 'My next assessment' : 'Ma prochaine évaluation'}</p>
            <p className="text-xs text-muted-foreground">
              {isEn ? 'Sequences 1 to 6, BEPC, Probatoire, Bac… set your own deadline.' : 'Séquences 1 à 6, BEPC, Probatoire, Bac… fixez votre propre échéance.'}
            </p>
          </div>
          {deadline && !editing && (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" disabled={saving} onClick={() => { setForm(deadline); setEditing(true); }} aria-label={isEn ? 'Edit deadline' : 'Modifier mon échéance'} title={isEn ? 'Edit deadline' : 'Modifier mon échéance'}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" disabled={saving} onClick={remove} aria-label={isEn ? 'Delete deadline' : 'Supprimer mon échéance'} title={isEn ? 'Delete deadline' : 'Supprimer mon échéance'}><Trash2 className="h-4 w-4" /></Button>
            </div>
          )}
        </div>

        {deadline && !editing ? (
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-primary">{days >= 0 ? days : 0}</span>
            <span className="text-sm">
              {days > 0 ? (isEn ? `day(s) before ${name}` : `jour(s) avant ${name}`)
                : days === 0 ? (isEn ? `${name} is today — good luck!` : `${name} aujourd'hui — bon courage !`)
                : (isEn ? `${name} has passed. Set a new deadline.` : `${name} est passé(e). Fixez une nouvelle échéance.`)}
            </span>
          </div>
        ) : editing ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="study-deadline-kind">{isEn ? 'Assessment' : 'Évaluation'}</Label>
              <Select value={form.kind} onValueChange={v => setForm({ ...form, kind: v })}>
                <SelectTrigger id="study-deadline-kind"><SelectValue /></SelectTrigger>
                <SelectContent>{DEADLINE_KINDS.map(k => <SelectItem key={k.id} value={k.id}>{isEn ? k.en : k.fr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.kind === 'custom' && (
              <div>
                <Label htmlFor="study-deadline-name">{isEn ? 'Name' : 'Nom'}</Label>
                <Input id="study-deadline-name" value={form.label || ''} maxLength={60} onChange={e => setForm({ ...form, label: e.target.value })} />
              </div>
            )}
            <div>
              <Label htmlFor="study-deadline-date">Date</Label>
              <Input id="study-deadline-date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={save} disabled={!validDeadline(form) || saving}>{saving ? '…' : isEn ? 'Save' : 'Enregistrer'}</Button>
              <Button variant="ghost" disabled={saving} onClick={() => setEditing(false)}>{isEn ? 'Cancel' : 'Annuler'}</Button>
            </div>
          </div>
        ) : (
          <Button className="mt-4" variant="outline" onClick={() => setEditing(true)}>
            {isEn ? 'Set my deadline' : 'Définir mon échéance'}
          </Button>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{isEn ? 'Your deadline and weekly goal follow your account across devices.' : 'Votre échéance et votre objectif hebdomadaire suivent votre compte sur vos appareils.'}</p>
      </CardContent>
    </Card>
  );
}
