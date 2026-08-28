import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link2, Loader2, Plus, Trash2 } from 'lucide-react';

interface ParentLink {
  link_id: string;
  parent_id: string;
  parent_email: string | null;
  parent_username: string | null;
  parent_name: string | null;
  child_user_id: string | null;
  child_email: string | null;
  child_username: string | null;
  child_name: string;
  status: string;
  created_at: string;
}

export default function ParentLinkManagement() {
  const { toast } = useToast();
  const [links, setLinks] = useState<ParentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [childIdentifier, setChildIdentifier] = useState<Record<string, string>>({});
  const [newParent, setNewParent] = useState('');
  const [newChild, setNewChild] = useState('');
  const [newChildName, setNewChildName] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_parent_links');
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    setLinks(((data as unknown as ParentLink[]) || []));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handle = async (promise: Promise<{ data: unknown; error: { message: string } | null }>, okMessage: string) => {
    setBusy(true);
    const { data, error } = await promise;
    setBusy(false);
    const res = data as { success?: boolean; error?: string } | null;
    if (error || res?.error) {
      toast({ title: 'Erreur', description: error?.message || res?.error, variant: 'destructive' });
      return false;
    }
    toast({ title: okMessage });
    load();
    return true;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Créer une relation parent / enfant</CardTitle>
          <CardDescription>
            Identifiez le parent et l'enfant par email ou nom d'utilisateur. L'enfant peut être renseigné plus tard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-4">
          <Input value={newParent} onChange={(e) => setNewParent(e.target.value)} placeholder="Parent (email ou @username)" />
          <Input value={newChild} onChange={(e) => setNewChild(e.target.value)} placeholder="Enfant (email ou @username)" />
          <Input value={newChildName} onChange={(e) => setNewChildName(e.target.value)} placeholder="Nom de l'enfant" />
          <Button
            disabled={busy || !newParent.trim()}
            onClick={async () => {
              const ok = await handle(
                supabase.rpc('admin_create_parent_link', {
                  p_parent_identifier: newParent.trim(),
                  p_child_identifier: newChild.trim() || null,
                  p_child_name: newChildName.trim() || null,
                }) as never,
                'Relation créée',
              );
              if (ok) {
                setNewParent('');
                setNewChild('');
                setNewChildName('');
              }
            }}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Créer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relations parent / enfant ({links.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune relation enregistrée.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parent</TableHead>
                  <TableHead>Enfant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((l) => (
                  <TableRow key={l.link_id}>
                    <TableCell>
                      <div className="font-medium">{l.parent_name || l.parent_email}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.parent_username ? `@${l.parent_username} · ` : ''}{l.parent_email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{l.child_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.child_username ? `@${l.child_username} · ` : ''}{l.child_email || 'compte non rattaché'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.status === 'linked' ? 'default' : l.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                        {!l.child_user_id && (
                          <>
                            <Input
                              className="w-56"
                              value={childIdentifier[l.link_id] || ''}
                              onChange={(e) => setChildIdentifier((p) => ({ ...p, [l.link_id]: e.target.value }))}
                              placeholder="email ou @username de l'élève"
                            />
                            <Button
                              size="sm"
                              disabled={busy || !(childIdentifier[l.link_id] || '').trim()}
                              onClick={() =>
                                handle(
                                  supabase.rpc('admin_link_parent_child', {
                                    p_link_id: l.link_id,
                                    p_child_identifier: (childIdentifier[l.link_id] || '').trim(),
                                  }) as never,
                                  'Enfant rattaché',
                                )
                              }
                            >
                              <Link2 className="mr-2 h-4 w-4" />
                              Rattacher
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            handle(
                              supabase.rpc('admin_delete_parent_link', { p_link_id: l.link_id }) as never,
                              'Relation supprimée',
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
