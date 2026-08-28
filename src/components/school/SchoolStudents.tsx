import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Copy, KeyRound, Plus, Trash2, Upload, Users } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  class_id: string | null;
  user_id: string | null;
  joined_at: string;
}

interface ClassOption { id: string; display_name: string }

interface Credential { name: string; email: string; password: string }

export default function SchoolStudents({ establishmentId }: { establishmentId: string }) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importClass, setImportClass] = useState('');
  const [importing, setImporting] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', class_id: '' });

  const load = async () => {
    const [{ data: st }, { data: cl }] = await Promise.all([
      supabase.from('establishment_students').select('id, full_name, email, phone, status, class_id, user_id, joined_at').eq('establishment_id', establishmentId).order('full_name'),
      supabase.from('establishment_classes').select('class_id, classes(id, display_name)').eq('establishment_id', establishmentId),
    ]);
    setStudents((st as Student[]) || []);
    setClasses((((cl as unknown as { classes: ClassOption }[]) || []).map((r) => r.classes).filter(Boolean)) as ClassOption[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [establishmentId]);

  // A school-created student becomes a real Yimaprof account: the edge function
  // creates the auth user, links the profile to the school and returns the
  // generated password once (it is never stored in clear text).
  const createStudent = async (payload: { fullName: string; email: string; phone?: string; classId: string }) => {
    const { data, error } = await supabase.functions.invoke('school-create-student', {
      body: { establishmentId, ...payload },
    });
    if (error || data?.error) return { error: data?.error || (fr ? 'Création impossible' : 'Creation failed') };
    return { password: data.password as string };
  };

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.full_name.trim().length < 3 || !form.class_id || !form.email.trim()) return;
    setSaving(true);
    const res = await createStudent({
      fullName: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      classId: form.class_id,
    });
    setSaving(false);
    if (res.error) {
      toast({ title: fr ? 'Erreur' : 'Error', description: res.error, variant: 'destructive' });
      return;
    }
    setCredentials([{ name: form.full_name.trim(), email: form.email.trim(), password: res.password! }]);
    toast({ title: fr ? 'Compte élève créé' : 'Student account created' });
    setOpen(false);
    setForm({ full_name: '', email: '', phone: '', class_id: '' });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('establishment_students').delete().eq('id', id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const handleFile = async (file: File) => setImportText(await file.text());

  const runImport = async () => {
    if (!importClass) {
      toast({ title: fr ? 'Choisissez une classe' : 'Pick a class', variant: 'destructive' });
      return;
    }
    const rows = importText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !/^(nom|name|full_?name)\s*[,;]/i.test(l))
      .map((l) => l.split(/[,;\t]/).map((c) => c.trim()))
      .filter((c) => c[0] && c[0].length >= 3 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c[1] || ''));

    if (!rows.length) {
      toast({
        title: fr ? 'Aucune ligne valide' : 'No valid rows',
        description: fr ? 'Chaque ligne doit contenir un nom et un email.' : 'Each line needs a name and an email.',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    const created: Credential[] = [];
    let failed = 0;
    for (const c of rows) {
      const res = await createStudent({ fullName: c[0], email: c[1], phone: c[2] || '', classId: importClass });
      if (res.error) failed += 1;
      else created.push({ name: c[0], email: c[1], password: res.password! });
    }
    setImporting(false);
    setCredentials(created);
    toast({
      title: `${created.length} ${fr ? 'comptes créés' : 'accounts created'}`,
      description: failed ? `${failed} ${fr ? 'lignes ignorées' : 'rows skipped'}` : undefined,
    });
    setImportOpen(false);
    setImportText('');
    setImportClass('');
    load();
  };

  const className = (id: string | null) => classes.find((c) => c.id === id)?.display_name || '—';

  const copyCredentials = () => {
    navigator.clipboard.writeText(credentials.map((c) => `${c.name}\t${c.email}\t${c.password}`).join('\n'));
    toast({ title: fr ? 'Identifiants copiés' : 'Credentials copied' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          {fr ? 'Élèves' : 'Students'} ({students.length})
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Upload className="h-4 w-4 mr-2" />{fr ? 'Importer' : 'Import'}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{fr ? 'Importer des élèves' : 'Import students'}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {fr
                    ? 'Format : une ligne par élève — Nom complet, email, téléphone. Un compte Yimaprof est créé pour chaque élève.'
                    : 'Format: one line per student — Full name, email, phone. A Yimaprof account is created for each student.'}
                </p>
                <div>
                  <Label htmlFor="csv">{fr ? 'Fichier CSV' : 'CSV file'}</Label>
                  <Input id="csv" type="file" accept=".csv,text/csv,text/plain" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </div>
                <div>
                  <Label htmlFor="paste">{fr ? 'Ou coller la liste' : 'Or paste the list'}</Label>
                  <Textarea id="paste" rows={8} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={'Jean Dupont, jean@mail.com, 690000000'} />
                </div>
                <div>
                  <Label>{fr ? 'Classe de l’établissement' : 'School class'}</Label>
                  <Select value={importClass} onValueChange={setImportClass}>
                    <SelectTrigger><SelectValue placeholder={fr ? 'Choisir une classe' : 'Pick a class'} /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setImportOpen(false)}>{fr ? 'Annuler' : 'Cancel'}</Button>
                  <Button onClick={runImport} disabled={importing || !importText.trim() || !importClass}>
                    {importing ? (fr ? 'Création…' : 'Creating…') : fr ? 'Créer les comptes' : 'Create accounts'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={classes.length === 0}><Plus className="h-4 w-4 mr-2" />{fr ? 'Ajouter' : 'Add'}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{fr ? 'Nouvel élève' : 'New student'}</DialogTitle></DialogHeader>
              <form onSubmit={addStudent} className="space-y-4">
                <div>
                  <Label htmlFor="fn">{fr ? 'Nom complet' : 'Full name'}</Label>
                  <Input id="fn" required maxLength={120} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="em">Email</Label>
                  <Input id="em" type="email" required maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="ph">{fr ? 'Téléphone' : 'Phone'}</Label>
                  <Input id="ph" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label>{fr ? 'Classe' : 'Class'}</Label>
                  <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                    <SelectTrigger><SelectValue placeholder={fr ? 'Choisir une classe' : 'Pick a class'} /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fr
                    ? 'Un compte Yimaprof est créé avec un mot de passe provisoire à communiquer à l’élève.'
                    : 'A Yimaprof account is created with a temporary password to hand to the student.'}
                </p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>{fr ? 'Annuler' : 'Cancel'}</Button>
                  <Button type="submit" disabled={saving || !form.class_id}>{fr ? 'Créer le compte' : 'Create account'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {classes.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            {fr
              ? 'Associez d’abord des classes à votre établissement dans l’onglet Classes.'
              : 'First associate classes with your school in the Classes tab.'}
          </p>
        )}

        {credentials.length > 0 && (
          <div className="rounded-lg border border-secondary/40 bg-secondary/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                {fr ? 'Mots de passe provisoires (affichés une seule fois)' : 'Temporary passwords (shown once)'}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyCredentials}><Copy className="h-4 w-4 mr-2" />{fr ? 'Copier' : 'Copy'}</Button>
                <Button size="sm" variant="ghost" onClick={() => setCredentials([])}>{fr ? 'Masquer' : 'Hide'}</Button>
              </div>
            </div>
            <div className="space-y-1 text-sm font-mono">
              {credentials.map((c) => (
                <div key={c.email} className="flex flex-wrap gap-x-3">
                  <span>{c.name}</span><span className="text-muted-foreground">{c.email}</span><span className="font-semibold">{c.password}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {fr
                ? 'L’élève devra changer ce mot de passe à sa première connexion.'
                : 'The student will be asked to change this password on first login.'}
            </p>
          </div>
        )}

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{fr ? 'Nom' : 'Name'}</TableHead>
                  <TableHead>{fr ? 'Classe' : 'Class'}</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>{fr ? 'Compte' : 'Account'}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell>{className(s.class_id)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">{s.email}</TableCell>
                    <TableCell>
                      <Badge variant={s.user_id ? 'secondary' : 'outline'}>
                        {s.user_id ? (fr ? 'Actif' : 'Active') : fr ? 'Sans compte' : 'No account'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
