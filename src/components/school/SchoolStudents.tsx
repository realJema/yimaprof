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
import { Plus, Trash2, Upload, Users } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  class_id: string | null;
  joined_at: string;
}

interface ClassOption { id: string; display_name: string }

export default function SchoolStudents({ establishmentId }: { establishmentId: string }) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importClass, setImportClass] = useState('');
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', class_id: '' });

  const load = async () => {
    const [{ data: st }, { data: cl }] = await Promise.all([
      supabase.from('establishment_students').select('id, full_name, email, phone, status, class_id, joined_at').eq('establishment_id', establishmentId).order('full_name'),
      supabase.from('establishment_classes').select('class_id, classes(id, display_name)').eq('establishment_id', establishmentId),
    ]);
    setStudents((st as Student[]) || []);
    setClasses((((cl as unknown as { classes: ClassOption }[]) || []).map((r) => r.classes).filter(Boolean)) as ClassOption[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [establishmentId]);

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.full_name.trim().length < 3) return;
    const { error } = await supabase.from('establishment_students').insert({
      establishment_id: establishmentId,
      full_name: form.full_name.trim().slice(0, 120),
      email: form.email.trim().slice(0, 255) || null,
      phone: form.phone.trim().slice(0, 30) || null,
      class_id: form.class_id || null,
    });
    if (error) {
      toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: fr ? 'Élève ajouté' : 'Student added' });
    setOpen(false);
    setForm({ full_name: '', email: '', phone: '', class_id: '' });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('establishment_students').delete().eq('id', id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    setImportText(text);
  };

  const runImport = async () => {
    const lines = importText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows = lines
      .filter((l) => !/^(nom|name|full_?name)\s*[,;]/i.test(l))
      .map((l) => l.split(/[,;\t]/).map((c) => c.trim()))
      .filter((c) => c[0] && c[0].length >= 3)
      .map((c) => ({
        establishment_id: establishmentId,
        full_name: c[0].slice(0, 120),
        email: (c[1] || '').slice(0, 255) || null,
        phone: (c[2] || '').slice(0, 30) || null,
        class_id: importClass || null,
      }));

    if (!rows.length) {
      toast({ title: fr ? 'Aucune ligne valide' : 'No valid rows', variant: 'destructive' });
      return;
    }
    setImporting(true);
    const { error } = await supabase.from('establishment_students').insert(rows);
    setImporting(false);
    if (error) {
      toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${rows.length} ${fr ? 'élèves importés' : 'students imported'}` });
    setImportOpen(false);
    setImportText('');
    setImportClass('');
    load();
  };

  const className = (id: string | null) => classes.find((c) => c.id === id)?.display_name || '—';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          {fr ? 'Élèves' : 'Students'} ({students.length})
        </CardTitle>
        <div className="flex items-center gap-2">
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Upload className="h-4 w-4 mr-2" />{fr ? 'Importer' : 'Import'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{fr ? 'Importer des élèves' : 'Import students'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {fr
                  ? 'Format : une ligne par élève — Nom complet, email, téléphone (CSV, points-virgules ou tabulations).'
                  : 'Format: one line per student — Full name, email, phone (CSV, semicolons or tabs).'}
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
                <Label>{fr ? 'Affecter à la classe' : 'Assign to class'}</Label>
                <Select value={importClass} onValueChange={setImportClass}>
                  <SelectTrigger><SelectValue placeholder={fr ? 'Optionnel' : 'Optional'} /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setImportOpen(false)}>{fr ? 'Annuler' : 'Cancel'}</Button>
                <Button onClick={runImport} disabled={importing || !importText.trim()}>{fr ? 'Importer' : 'Import'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />{fr ? 'Ajouter' : 'Add'}</Button>
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
                <Input id="em" type="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{fr ? 'Annuler' : 'Cancel'}</Button>
                <Button type="submit">{fr ? 'Enregistrer' : 'Save'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{fr ? 'Nom' : 'Name'}</TableHead>
                  <TableHead>{fr ? 'Classe' : 'Class'}</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>{fr ? 'Statut' : 'Status'}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell>{className(s.class_id)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.email}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'active' ? 'secondary' : 'outline'}>
                        {s.status === 'active' ? (fr ? 'Actif' : 'Active') : fr ? 'Inactif' : 'Inactive'}
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