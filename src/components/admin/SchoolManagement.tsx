import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Building2, Users, GraduationCap, Coins, Search, Pencil, Check, X, Clock, Link2, Trash2, Crown } from 'lucide-react';

interface School {
  id: string;
  name: string;
  type: string | null;
  city: string | null;
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  referral_code: string | null;
  is_active: boolean;
  created_at: string;
  approval_status: string;
  rejection_reason: string | null;
  owner_id: string | null;
}

interface LinkedUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  is_owner: boolean;
  is_school_admin: boolean;
}

interface Counts {
  students: number;
  classes: number;
  commissions: number;
}

export function SchoolManagement() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { toast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<School | null>(null);
  const [form, setForm] = useState({ name: '', type: 'private', city: '', contact_email: '', contact_phone: '' });
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [linking, setLinking] = useState<School | null>(null);
  const [linkedUsers, setLinkedUsers] = useState<LinkedUser[]>([]);
  const [linkEmail, setLinkEmail] = useState('');
  const [makeOwner, setMakeOwner] = useState(false);
  const [busy, setBusy] = useState(false);

  const setApproval = async (s: School, status: 'pending' | 'approved' | 'rejected') => {
    let reason: string | null = null;
    if (status === 'rejected') {
      reason = window.prompt(fr ? 'Motif du refus (optionnel)' : 'Rejection reason (optional)') || null;
    }
    const { data, error } = await supabase.rpc('admin_set_establishment_approval', {
      p_establishment_id: s.id,
      p_status: status,
      p_reason: reason,
    });
    const result = data as { success?: boolean; error?: string } | null;
    if (error || !result?.success) {
      toast({ title: fr ? 'Action impossible' : 'Action failed', description: error?.message || result?.error, variant: 'destructive' });
      return;
    }
    toast({ title: fr ? 'Statut mis à jour' : 'Status updated' });
    load();
  };

  const openLink = async (s: School) => {
    setLinking(s);
    setLinkEmail('');
    setMakeOwner(false);
    const { data } = await supabase.rpc('admin_list_establishment_users', { p_establishment_id: s.id });
    setLinkedUsers((data as LinkedUser[] | null) || []);
  };

  const refreshLinked = async (id: string) => {
    const { data } = await supabase.rpc('admin_list_establishment_users', { p_establishment_id: id });
    setLinkedUsers((data as LinkedUser[] | null) || []);
  };

  const linkUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linking) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_link_user_to_establishment', {
      p_email: linkEmail.trim(),
      p_establishment_id: linking.id,
      p_make_owner: makeOwner,
      p_grant_school_admin: true,
    });
    setBusy(false);
    const result = data as { success?: boolean; error?: string } | null;
    if (error || !result?.success) {
      toast({ title: fr ? 'Liaison impossible' : 'Link failed', description: error?.message || result?.error, variant: 'destructive' });
      return;
    }
    toast({ title: fr ? 'Utilisateur lié' : 'User linked' });
    setLinkEmail('');
    setMakeOwner(false);
    await refreshLinked(linking.id);
    load();
  };

  const unlinkUser = async (u: LinkedUser) => {
    if (!linking) return;
    const { data, error } = await supabase.rpc('admin_unlink_user_from_establishment', {
      p_user_id: u.id,
      p_establishment_id: linking.id,
    });
    const result = data as { success?: boolean; error?: string } | null;
    if (error || !result?.success) {
      toast({ title: fr ? 'Action impossible' : 'Action failed', description: error?.message || result?.error, variant: 'destructive' });
      return;
    }
    toast({ title: fr ? 'Utilisateur délié' : 'User unlinked' });
    await refreshLinked(linking.id);
    load();
  };

  const load = async () => {
    setLoading(true);
    const [{ data: est, error }, { data: students }, { data: klasses }, { data: comms }] = await Promise.all([
      supabase.from('establishments').select('*').order('created_at', { ascending: false }),
      supabase.from('establishment_students').select('establishment_id'),
      supabase.from('establishment_classes').select('establishment_id'),
      supabase.from('establishment_commissions').select('establishment_id, amount'),
    ]);
    if (error) {
      toast({ title: fr ? 'Chargement impossible' : 'Failed to load schools', variant: 'destructive' });
    }
    const map: Record<string, Counts> = {};
    const bump = (id: string, key: keyof Counts, value = 1) => {
      map[id] = map[id] || { students: 0, classes: 0, commissions: 0 };
      map[id][key] += value;
    };
    (students || []).forEach((s) => bump(s.establishment_id, 'students'));
    (klasses || []).forEach((c) => bump(c.establishment_id, 'classes'));
    (comms || []).forEach((c) => bump(c.establishment_id, 'commissions', c.amount || 0));
    setCounts(map);
    setSchools((est || []) as School[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (s: School) => {
    setEditing(s);
    setForm({
      name: s.name,
      type: s.type || 'private',
      city: s.city || '',
      contact_email: s.contact_email || '',
      contact_phone: s.contact_phone || '',
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const { error } = await supabase
      .from('establishments')
      .update({
        name: form.name.trim().slice(0, 150),
        type: form.type,
        city: form.city.trim().slice(0, 100) || null,
        contact_email: form.contact_email.trim().slice(0, 255) || null,
        contact_phone: form.contact_phone.trim().slice(0, 30) || null,
      })
      .eq('id', editing.id);
    if (error) {
      toast({ title: fr ? 'Enregistrement impossible' : 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: fr ? 'Établissement mis à jour' : 'School updated' });
    setEditing(null);
    load();
  };

  const toggleActive = async (s: School) => {
    const { error } = await supabase.from('establishments').update({ is_active: !s.is_active }).eq('id', s.id);
    if (error) {
      toast({ title: fr ? 'Action impossible' : 'Action failed', description: error.message, variant: 'destructive' });
      return;
    }
    setSchools((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: !s.is_active } : x)));
  };

  const filtered = schools
    .filter((s) => statusFilter === 'all' || (s.approval_status || 'pending') === statusFilter)
    .filter((s) =>
      [s.name, s.city, s.referral_code, s.contact_email].some((v) => (v || '').toLowerCase().includes(search.toLowerCase())),
    );

  const pendingCount = schools.filter((s) => (s.approval_status || 'pending') === 'pending').length;

  const totalStudents = Object.values(counts).reduce((a, c) => a + c.students, 0);

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          {fr ? 'Gestion des établissements' : 'School management'}
          <Badge variant="secondary">{schools.length}</Badge>
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{fr ? 'Tous les statuts' : 'All statuses'}</SelectItem>
              <SelectItem value="pending">{fr ? `En attente (${pendingCount})` : `Pending (${pendingCount})`}</SelectItem>
              <SelectItem value="approved">{fr ? 'Approuvés' : 'Approved'}</SelectItem>
              <SelectItem value="rejected">{fr ? 'Refusés' : 'Rejected'}</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={fr ? 'Rechercher…' : 'Search…'} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border p-3 border-secondary/50 bg-secondary/10">
            <p className="text-xs text-muted-foreground">{fr ? 'Demandes en attente' : 'Pending requests'}</p>
            <p className="text-lg font-semibold">{pendingCount}</p>
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-xs text-muted-foreground">{fr ? 'Établissements actifs' : 'Active schools'}</p>
            <p className="text-lg font-semibold">{schools.filter((s) => s.is_active).length}</p>
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-xs text-muted-foreground">{fr ? 'Élèves inscrits' : 'Enrolled students'}</p>
            <p className="text-lg font-semibold">{totalStudents}</p>
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-xs text-muted-foreground">{fr ? 'Commissions cumulées' : 'Total commissions'}</p>
            <p className="text-lg font-semibold">
              {Object.values(counts).reduce((a, c) => a + c.commissions, 0).toLocaleString()} FCFA
            </p>
          </div>
        </div>

        {!loading && pendingCount > 0 && (
          <div className="rounded-lg border-2 border-secondary/60 bg-secondary/5 p-3 sm:p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-secondary" />
              <p className="font-semibold text-sm">
                {fr ? 'Écoles en attente d’approbation' : 'Schools awaiting approval'}
              </p>
              <Badge variant="secondary">{pendingCount}</Badge>
            </div>
            {schools
              .filter((s) => (s.approval_status || 'pending') === 'pending')
              .map((s) => (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md bg-background border border-border/50 p-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[s.city, s.contact_email, s.contact_phone].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => setApproval(s, 'approved')}>
                      <Check className="h-3.5 w-3.5 mr-1" />{fr ? 'Valider' : 'Approve'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setApproval(s, 'rejected')}>
                      <X className="h-3.5 w-3.5 mr-1" />{fr ? 'Rejeter' : 'Reject'}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{fr ? 'Aucun établissement.' : 'No schools yet.'}</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const c = counts[s.id] || { students: 0, classes: 0, commissions: 0 };
              return (
                <div key={s.id} className="rounded-lg border border-border/50 p-3 sm:p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{s.name}</p>
                        {s.type && <Badge variant="outline">{s.type}</Badge>}
                        <Badge variant={s.is_active ? 'default' : 'secondary'}>
                          {s.is_active ? (fr ? 'Actif' : 'Active') : fr ? 'Inactif' : 'Inactive'}
                        </Badge>
                        {(s.approval_status || 'pending') === 'pending' && (
                          <Badge variant="outline" className="gap-1 border-secondary text-secondary">
                            <Clock className="h-3 w-3" />{fr ? 'En attente' : 'Pending'}
                          </Badge>
                        )}
                        {s.approval_status === 'approved' && (
                          <Badge variant="outline" className="gap-1"><Check className="h-3 w-3" />{fr ? 'Approuvé' : 'Approved'}</Badge>
                        )}
                        {s.approval_status === 'rejected' && (
                          <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" />{fr ? 'Refusé' : 'Rejected'}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {[s.city, s.country, s.contact_email, s.contact_phone].filter(Boolean).join(' • ')}
                      </p>
                      {s.referral_code && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {fr ? 'Code de parrainage' : 'Referral code'}: <span className="font-mono">{s.referral_code}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} aria-label="toggle active" />
                      <Button variant="outline" size="sm" onClick={() => openLink(s)} title={fr ? 'Utilisateurs liés' : 'Linked users'}>
                        <Link2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {s.approval_status === 'rejected' && s.rejection_reason && (
                    <p className="text-xs text-destructive">{s.rejection_reason}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {s.approval_status !== 'approved' && (
                      <Button size="sm" onClick={() => setApproval(s, 'approved')}>
                        <Check className="h-3.5 w-3.5 mr-1" />{fr ? 'Valider' : 'Approve'}
                      </Button>
                    )}
                    {s.approval_status !== 'rejected' && (
                      <Button size="sm" variant="destructive" onClick={() => setApproval(s, 'rejected')}>
                        <X className="h-3.5 w-3.5 mr-1" />{fr ? 'Rejeter' : 'Reject'}
                      </Button>
                    )}
                    {s.approval_status !== 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => setApproval(s, 'pending')}>
                        <Clock className="h-3.5 w-3.5 mr-1" />{fr ? 'Remettre en attente' : 'Set pending'}
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.students} {fr ? 'élèves' : 'students'}</span>
                    <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{c.classes} {fr ? 'classes' : 'classes'}</span>
                    <span className="flex items-center gap-1"><Coins className="h-3.5 w-3.5" />{c.commissions.toLocaleString()} FCFA</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fr ? 'Modifier l’établissement' : 'Edit school'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label htmlFor="esn">{fr ? 'Nom' : 'Name'}</Label>
              <Input id="esn" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{fr ? 'Type' : 'Type'}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">{fr ? 'Public' : 'Public'}</SelectItem>
                    <SelectItem value="private">{fr ? 'Privé' : 'Private'}</SelectItem>
                    <SelectItem value="international">International</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="esc">{fr ? 'Ville' : 'City'}</Label>
                <Input id="esc" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ese">{fr ? 'Email' : 'Email'}</Label>
                <Input id="ese" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="esp">{fr ? 'Téléphone' : 'Phone'}</Label>
                <Input id="esp" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                {fr ? 'Annuler' : 'Cancel'}
              </Button>
              <Button type="submit">{fr ? 'Enregistrer' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!linking} onOpenChange={(o) => !o && setLinking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fr ? 'Utilisateurs de l’établissement' : 'School users'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{linking?.name}</p>

            <div className="space-y-2">
              {linkedUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">{fr ? 'Aucun utilisateur lié.' : 'No linked user.'}</p>
              )}
              {linkedUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2 rounded-md border border-border/50 p-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {u.is_owner && <Badge variant="secondary" className="gap-1 text-xs"><Crown className="h-3 w-3" />{fr ? 'Responsable' : 'Owner'}</Badge>}
                    {u.is_school_admin && <Badge variant="outline" className="text-xs">school_admin</Badge>}
                    <Button size="sm" variant="ghost" onClick={() => unlinkUser(u)} title={fr ? 'Délier' : 'Unlink'}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={linkUser} className="space-y-3 border-t border-border/50 pt-4">
              <div>
                <Label htmlFor="lue">{fr ? 'Email de l’utilisateur à lier' : 'Email of user to link'}</Label>
                <Input id="lue" type="email" required value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="lmo" checked={makeOwner} onCheckedChange={setMakeOwner} />
                <Label htmlFor="lmo" className="text-sm">{fr ? 'Définir comme responsable' : 'Set as owner'}</Label>
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                <Link2 className="h-4 w-4 mr-1" />
                {busy ? (fr ? 'Liaison…' : 'Linking…') : fr ? 'Lier l’utilisateur' : 'Link user'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
