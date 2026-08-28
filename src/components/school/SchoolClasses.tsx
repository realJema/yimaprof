import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';

interface ClassRow {
  id: string;
  label: string | null;
  teacher_name: string | null;
  class_id: string;
  classes: { display_name: string } | null;
}

interface PlatformClass { id: string; display_name: string }

interface ResultRow { class_id: string; percent: number; student_id: string }

export default function SchoolClasses({ establishmentId }: { establishmentId: string }) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { toast } = useToast();
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [platformClasses, setPlatformClasses] = useState<PlatformClass[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ class_id: '', label: '', teacher_name: '' });

  const load = async () => {
    const [{ data: cl }, { data: st }, res, { data: all }] = await Promise.all([
      supabase.from('establishment_classes').select('id, label, teacher_name, class_id, classes(display_name)').eq('establishment_id', establishmentId),
      supabase.from('establishment_students').select('class_id').eq('establishment_id', establishmentId),
      supabase.rpc('establishment_results', { p_establishment_id: establishmentId }),
      supabase.from('classes').select('id, display_name').order('display_name'),
    ]);
    setRows((cl as unknown as ClassRow[]) || []);
    setResults((res.data as unknown as ResultRow[]) || []);
    setPlatformClasses((all as PlatformClass[]) || []);
    const c: Record<string, number> = {};
    (st || []).forEach((s) => { if (s.class_id) c[s.class_id] = (c[s.class_id] || 0) + 1; });
    setCounts(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, [establishmentId]);

  // Schools do not create their own class catalogue: they associate the classes
  // that already exist on the platform (3e, 2nde, Terminale, Form 5, ...).
  const addClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.class_id) return;
    const { error } = await supabase.from('establishment_classes').insert({
      establishment_id: establishmentId,
      class_id: form.class_id,
      label: form.label.trim().slice(0, 60) || null,
      teacher_name: form.teacher_name.trim().slice(0, 120) || null,
    });
    if (error) {
      toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: fr ? 'Classe associée' : 'Class associated' });
    setOpen(false);
    setForm({ class_id: '', label: '', teacher_name: '' });
    load();
  };

  const removeClass = async (row: ClassRow) => {
    if ((counts[row.class_id] || 0) > 0) {
      toast({
        title: fr ? 'Classe non vide' : 'Class not empty',
        description: fr ? 'Déplacez d’abord les élèves de cette classe.' : 'Move the students of this class first.',
        variant: 'destructive',
      });
      return;
    }
    await supabase.from('establishment_classes').delete().eq('id', row.id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const available = platformClasses.filter((p) => !rows.some((r) => r.class_id === p.id));

  if (loading) return <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {fr
            ? 'Associez à votre établissement les classes officielles de la plateforme.'
            : 'Associate the official platform classes with your school.'}
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={available.length === 0}>
              <Plus className="h-4 w-4 mr-2" />{fr ? 'Associer une classe' : 'Associate a class'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{fr ? 'Associer une classe' : 'Associate a class'}</DialogTitle></DialogHeader>
            <form onSubmit={addClass} className="space-y-4">
              <div>
                <Label>{fr ? 'Classe de la plateforme' : 'Platform class'}</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder={fr ? 'Choisir' : 'Choose'} /></SelectTrigger>
                  <SelectContent>
                    {available.map((c) => <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="lb">{fr ? 'Libellé interne (optionnel)' : 'Internal label (optional)'}</Label>
                <Input id="lb" maxLength={60} placeholder={fr ? 'Terminale C1' : 'Upper Sixth A'} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="tc">{fr ? 'Enseignant principal (optionnel)' : 'Main teacher (optional)'}</Label>
                <Input id="tc" maxLength={120} value={form.teacher_name} onChange={(e) => setForm({ ...form, teacher_name: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{fr ? 'Annuler' : 'Cancel'}</Button>
                <Button type="submit" disabled={!form.class_id}>{fr ? 'Associer' : 'Associate'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => {
          const classResults = results.filter((r) => r.class_id === row.class_id);
          const avg = classResults.length ? Math.round(classResults.reduce((s, r) => s + Number(r.percent), 0) / classResults.length) : 0;
          const activeStudents = new Set(classResults.map((r) => r.student_id)).size;
          return (
            <Card key={row.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="flex items-center gap-2 min-w-0">
                    <GraduationCap className="h-4 w-4 text-secondary shrink-0" />
                    <span className="truncate">{row.label || row.classes?.display_name}</span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline">{counts[row.class_id] || 0} {fr ? 'élèves' : 'students'}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => removeClass(row)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {row.classes?.display_name} · {fr ? 'Enseignant' : 'Teacher'}: {row.teacher_name || '—'}
                </p>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{fr ? 'Moyenne de la classe' : 'Class average'}</span>
                    <span className="font-semibold">{avg}%</span>
                  </div>
                  <Progress value={avg} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeStudents} {fr ? 'élèves évalués' : 'students evaluated'} · {classResults.length} {fr ? 'évaluations' : 'evaluations'}
                </p>
              </CardContent>
            </Card>
          );
        })}
        {rows.length === 0 && <p className="text-muted-foreground">{fr ? 'Aucune classe associée.' : 'No class associated yet.'}</p>}
      </div>
    </div>
  );
}
