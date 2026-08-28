import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, GraduationCap, Clock, Award, BookOpen } from 'lucide-react';

interface Child {
  link_id: string;
  child_user_id: string | null;
  child_name: string;
  child_username: string | null;
  status: string;
  class_name: string | null;
  lessons_started: number;
  lessons_completed: number;
  time_spent_seconds: number;
  evaluations_count: number;
  average_percent: number;
  last_activity: string | null;
}

interface ChildResult {
  evaluation_id: string;
  exam_title: string | null;
  subject_name: string | null;
  lesson_title: string | null;
  score: number | null;
  possible: number | null;
  percent: number | null;
  time_spent_seconds: number | null;
  completed_at: string | null;
}

export default function ParentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isParent, isAdmin, loading: rolesLoading } = useUserRoles();
  const { language } = useLanguage();
  const { toast } = useToast();
  const fr = language === 'fr';

  const [children, setChildren] = useState<Child[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<ChildResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChild, setNewChild] = useState('');
  const [adding, setAdding] = useState(false);

  const loadChildren = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('parent_children_overview');
    const list = ((data as unknown as Child[]) || []);
    setChildren(list);
    const firstLinked = list.find((c) => c.status === 'linked' && c.child_user_id);
    setSelected((prev) => prev ?? firstLinked?.child_user_id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (!user || rolesLoading || (!isParent && !isAdmin)) return;
    loadChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, rolesLoading, isParent, isAdmin]);

  useEffect(() => {
    if (!selected) {
      setResults([]);
      return;
    }
    (async () => {
      const { data } = await supabase.rpc('parent_child_results', { p_child_user_id: selected });
      setResults(((data as unknown as ChildResult[]) || []));
    })();
  }, [selected]);

  const addChild = async () => {
    const name = newChild.trim();
    if (name.length < 2) return;
    setAdding(true);
    const { error } = await supabase.from('parent_children').insert({
      parent_id: user!.id,
      child_name: name,
      status: 'pending',
    });
    setAdding(false);
    if (error) {
      toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setNewChild('');
    toast({
      title: fr ? 'Enfant déclaré' : 'Child declared',
      description: fr
        ? "Un administrateur validera le rattachement au compte de l'élève."
        : 'An administrator will confirm the link to the student account.',
    });
    loadChildren();
  };

  if (authLoading || rolesLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isParent && !isAdmin) return <Navigate to="/dashboard" replace />;

  const hours = (s: number) => `${Math.round((s || 0) / 360) / 10} h`;
  const selectedChild = children.find((c) => c.child_user_id === selected);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{fr ? 'Espace Parent' : 'Parent space'}</h1>
          <p className="text-sm text-muted-foreground">
            {fr ? 'Suivez la progression et les résultats de vos enfants.' : "Follow your children's progress and results."}
          </p>
        </div>
        <Badge variant="secondary">{fr ? 'Profil parent' : 'Parent profile'}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{fr ? 'Déclarer un enfant' : 'Declare a child'}</CardTitle>
          <CardDescription>
            {fr
              ? "Indiquez le nom de votre enfant. Le rattachement au compte élève est validé par un administrateur."
              : 'Enter your child name. An administrator confirms the link to the student account.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={newChild}
            onChange={(e) => setNewChild(e.target.value)}
            placeholder={fr ? "Nom complet de l'enfant" : "Child's full name"}
          />
          <Button onClick={addChild} disabled={adding || newChild.trim().length < 2}>
            {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {fr ? 'Ajouter' : 'Add'}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : children.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {fr ? 'Aucun enfant déclaré pour le moment.' : 'No child declared yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map((c) => {
            const linked = c.status === 'linked' && c.child_user_id;
            return (
              <Card
                key={c.link_id}
                className={`transition-colors ${linked ? 'cursor-pointer hover:border-primary' : 'opacity-80'} ${
                  selected && c.child_user_id === selected ? 'border-primary' : ''
                }`}
                onClick={() => linked && setSelected(c.child_user_id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{c.child_name}</CardTitle>
                      {c.child_username && <CardDescription>@{c.child_username}</CardDescription>}
                    </div>
                    <Badge variant={linked ? 'default' : 'outline'}>
                      {linked ? (fr ? 'Rattaché' : 'Linked') : fr ? 'En attente' : 'Pending'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {c.class_name && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <GraduationCap className="h-4 w-4" /> {c.class_name}
                    </p>
                  )}
                  {linked ? (
                    <>
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>{fr ? 'Moyenne' : 'Average'}</span>
                          <span>{Number(c.average_percent || 0)}%</span>
                        </div>
                        <Progress value={Number(c.average_percent || 0)} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <BookOpen className="mx-auto h-4 w-4 text-muted-foreground" />
                          <p className="mt-1 font-semibold">{c.lessons_completed}/{c.lessons_started}</p>
                          <p className="text-muted-foreground">{fr ? 'leçons' : 'lessons'}</p>
                        </div>
                        <div>
                          <Award className="mx-auto h-4 w-4 text-muted-foreground" />
                          <p className="mt-1 font-semibold">{c.evaluations_count}</p>
                          <p className="text-muted-foreground">{fr ? 'évaluations' : 'evaluations'}</p>
                        </div>
                        <div>
                          <Clock className="mx-auto h-4 w-4 text-muted-foreground" />
                          <p className="mt-1 font-semibold">{hours(c.time_spent_seconds)}</p>
                          <p className="text-muted-foreground">{fr ? 'travail' : 'work'}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {fr ? "En attente de validation par l'administration." : 'Waiting for administrator validation.'}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedChild && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {fr ? 'Résultats de' : 'Results for'} {selectedChild.child_name}
            </CardTitle>
            <CardDescription>{results.length} {fr ? 'évaluation(s)' : 'evaluation(s)'}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">{fr ? 'Aucun résultat enregistré.' : 'No result recorded.'}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{fr ? 'Épreuve' : 'Paper'}</TableHead>
                    <TableHead>{fr ? 'Matière' : 'Subject'}</TableHead>
                    <TableHead>{fr ? 'Note' : 'Score'}</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>{fr ? 'Date' : 'Date'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.evaluation_id}>
                      <TableCell className="font-medium">{r.exam_title || r.lesson_title || '—'}</TableCell>
                      <TableCell>{r.subject_name || '—'}</TableCell>
                      <TableCell>{Number(r.score || 0)}/{Number(r.possible || 20)}</TableCell>
                      <TableCell>
                        <Badge variant={Number(r.percent || 0) >= 50 ? 'default' : 'destructive'}>
                          {Number(r.percent || 0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {r.completed_at ? new Date(r.completed_at).toLocaleDateString(fr ? 'fr-FR' : 'en-US') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
