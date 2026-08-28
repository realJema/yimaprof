import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Students created by a school get a temporary password. `profiles.must_change_password`
 * stays true until they choose their own password, and this dialog blocks the app until then.
 */
export default function ForcePasswordChange() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !user) {
      setOpen(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .maybeSingle();
      setOpen(!!(data as { must_change_password?: boolean } | null)?.must_change_password);
    })();
  }, [user, authLoading]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || password !== confirm) {
      toast({
        title: fr ? 'Mot de passe invalide' : 'Invalid password',
        description: fr ? '8 caractères minimum et les deux champs doivent correspondre.' : 'At least 8 characters and both fields must match.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSaving(false);
      toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.from('profiles').update({ must_change_password: false } as never).eq('id', user!.id);
    setSaving(false);
    setOpen(false);
    setPassword('');
    setConfirm('');
    toast({ title: fr ? 'Mot de passe mis à jour' : 'Password updated' });
  };

  return (
    <Dialog open={open}>
      <DialogContent className="[&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{fr ? 'Choisissez votre mot de passe' : 'Choose your password'}</DialogTitle>
          <DialogDescription>
            {fr
              ? 'Votre compte a été créé par votre établissement avec un mot de passe provisoire. Définissez le vôtre pour continuer.'
              : 'Your account was created by your school with a temporary password. Set your own to continue.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="np">{fr ? 'Nouveau mot de passe' : 'New password'}</Label>
            <Input id="np" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cp">{fr ? 'Confirmer' : 'Confirm'}</Label>
            <Input id="cp" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {fr ? 'Enregistrer' : 'Save'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
