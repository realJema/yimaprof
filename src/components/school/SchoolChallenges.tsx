import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Plus, Trophy } from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  status: string;
  reward: string | null;
  starts_at: string;
  ends_at: string;
}

interface Participant {
  challenge_id: string;
  class_id: string | null;
  points: number;
  average_percent: number;
  establishment_students: { full_name: string } | null;
  classes: { display_name: string } | null;
}

export default function SchoolChallenges({ establishmentId }: { establishmentId: string }) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { user } = useAuth();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', reward: '', ends_at: '' });

  const load = async () => {
    const { data: ch } = await supabase
      .from('challenges')
      .select('id, title, description, status, reward, starts_at, ends_at')
      .eq('establishment_id', establishmentId)
      .order('starts_at', { ascending: false });
    const list = (ch as Challenge[]) || [];
    setChallenges(list);
    if (list.length) {
      const { data: pa } = await supabase
        .from('challenge_participants')
        .select('challenge_id, class_id, points, average_percent, establishment_students(full_name), classes(display_name)')
        .in('challenge_id', list.map((c) => c.id));
      setParticipants((pa as unknown as Participant[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [establishmentId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 3) return;
    const { error } = await supabase.from('challenges').insert({
      establishment_id: establishmentId,
      title: form.title.trim().slice(0, 150),
      description: form.description.trim().slice(0, 500) || null,
      reward: form.reward.trim().slice(0, 150) || null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
      created_by: user?.id,
    });
    if (error) {
      toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: fr ? 'Challenge créé' : 'Challenge created' });
    setOpen(false);
    setForm({ title: '', description: '', reward: '', ends_at: '' });
    load();
  };

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />{fr ? 'Nouveau challenge' : 'New challenge'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{fr ? 'Créer un challenge' : 'Create a challenge'}</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div>
                <Label htmlFor="ct">{fr ? 'Titre' : 'Title'}</Label>
                <Input id="ct" required maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="cd">Description</Label>
                <Textarea id="cd" maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="cr">{fr ? 'Récompense' : 'Reward'}</Label>
                <Input id="cr" maxLength={150} value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="ce">{fr ? 'Date de fin' : 'End date'}</Label>
                <Input id="ce" type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{fr ? 'Annuler' : 'Cancel'}</Button>
                <Button type="submit">{fr ? 'Créer' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {challenges.map((ch) => {
        const parts = participants.filter((p) => p.challenge_id === ch.id);
        const byClass = new Map<string, { points: number; count: number }>();
        parts.forEach((p) => {
          const key = p.classes?.display_name || '—';
          const cur = byClass.get(key) || { points: 0, count: 0 };
          byClass.set(key, { points: cur.points + p.points, count: cur.count + 1 });
        });
        const ranking = Array.from(byClass.entries())
          .map(([name, v]) => ({ name, points: v.points, count: v.count }))
          .sort((a, b) => b.points - a.points);
        const topStudents = [...parts].sort((a, b) => b.points - a.points).slice(0, 5);

        return (
          <Card key={ch.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2"><Award className="h-4 w-4 text-secondary" />{ch.title}</span>
                <Badge variant={ch.status === 'active' ? 'secondary' : 'outline'}>
                  {ch.status === 'active' ? (fr ? 'En cours' : 'Active') : fr ? 'Terminé' : 'Completed'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{ch.description}</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{new Date(ch.starts_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')} → {new Date(ch.ends_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')}</span>
                {ch.reward && <span>🏅 {ch.reward}</span>}
                <span>{parts.length} {fr ? 'participants' : 'participants'}</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1"><Trophy className="h-4 w-4" />{fr ? 'Classement des classes' : 'Class ranking'}</p>
                  <div className="space-y-1">
                    {ranking.map((r, i) => (
                      <div key={r.name} className="flex items-center justify-between text-sm rounded-md bg-muted/50 px-3 py-1.5">
                        <span>{i + 1}. {r.name}</span>
                        <span className="font-semibold">{r.points} pts</span>
                      </div>
                    ))}
                    {ranking.length === 0 && <p className="text-xs text-muted-foreground">{fr ? 'Pas encore de participants.' : 'No participants yet.'}</p>}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">{fr ? 'Top élèves' : 'Top students'}</p>
                  <div className="space-y-1">
                    {topStudents.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm rounded-md bg-muted/50 px-3 py-1.5">
                        <span>{p.establishment_students?.full_name || '—'}</span>
                        <span className="text-muted-foreground">{p.points} pts · {Number(p.average_percent).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {challenges.length === 0 && <p className="text-muted-foreground">{fr ? 'Aucun challenge pour le moment.' : 'No challenge yet.'}</p>}
    </div>
  );
}