import { useEffect, useState } from 'react';
import { CalendarClock, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

export const DEADLINE_KINDS = [
  { id: 'seq1', fr: '1ère Séquence', en: '1st Sequence' },
  { id: 'seq2', fr: '2e Séquence', en: '2nd Sequence' },
  { id: 'seq3', fr: '3e Séquence', en: '3rd Sequence' },
  { id: 'seq4', fr: '4e Séquence', en: '4th Sequence' },
  { id: 'seq5', fr: '5e Séquence', en: '5th Sequence' },
  { id: 'seq6', fr: '6e Séquence', en: '6th Sequence' },
  { id: 'bepc', fr: 'BEPC', en: 'BEPC' },
  { id: 'probatoire', fr: 'Probatoire', en: 'Probatoire' },
  { id: 'bac', fr: 'Baccalauréat', en: 'Baccalauréat' },
  { id: 'gce_o', fr: 'GCE O Level', en: 'GCE O Level' },
  { id: 'gce_a', fr: 'GCE A Level', en: 'GCE A Level' },
  { id: 'custom', fr: 'Autre évaluation', en: 'Other assessment' },
];

type Deadline = { kind: string; label?: string; date: string };

export function daysUntil(date: string, now = new Date()): number {
  const target = new Date(date + 'T00:00:00');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function StudyDeadlineCard({ userId }: { userId?: string }) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const key = `yima_deadline_${userId || 'guest'}`;
  const [deadline, setDeadline] = useState<Deadline | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Deadline>({ kind: 'seq1', label: '', date: '' });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setDeadline(raw ? JSON.parse(raw) : null);
    } catch { setDeadline(null); }
  }, [key]);

  const save = () => {
    if (!form.date) return;
    localStorage.setItem(key, JSON.stringify(form));
    setDeadline(form);
    setEditing(false);
  };
  const remove = () => { localStorage.removeItem(key); setDeadline(null); };

  const kind = DEADLINE_KINDS.find(k => k.id === deadline?.kind);
  const name = deadline?.kind === 'custom' && deadline.label ? deadline.label : kind ? (isEn ? kind.en : kind.fr) : '';
  const days = deadline ? daysUntil(deadline.date) : 0;

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
              <Button size="icon" variant="ghost" onClick={() => { setForm(deadline); setEditing(true); }} aria-label="edit"><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={remove} aria-label="delete"><Trash2 className="h-4 w-4" /></Button>
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
              <Label>{isEn ? 'Assessment' : 'Évaluation'}</Label>
              <Select value={form.kind} onValueChange={v => setForm({ ...form, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEADLINE_KINDS.map(k => <SelectItem key={k.id} value={k.id}>{isEn ? k.en : k.fr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.kind === 'custom' && (
              <div>
                <Label>{isEn ? 'Name' : 'Nom'}</Label>
                <Input value={form.label || ''} maxLength={60} onChange={e => setForm({ ...form, label: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={save} disabled={!form.date}>{isEn ? 'Save' : 'Enregistrer'}</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>{isEn ? 'Cancel' : 'Annuler'}</Button>
            </div>
          </div>
        ) : (
          <Button className="mt-4" variant="outline" onClick={() => setEditing(true)}>
            {isEn ? 'Set my deadline' : 'Définir mon échéance'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
