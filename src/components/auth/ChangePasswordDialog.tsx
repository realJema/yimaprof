import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { validatePassword } from "@/lib/passwordRules";

const SUPABASE_URL = "https://nrcdtxgmlhxbtfppxqop.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY2R0eGdtbGh4YnRmcHB4cW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTIxOTYsImV4cCI6MjA3MzA2ODE5Nn0.gQP0cZoQGVPhppmZTCaUdmm1C7yB6MiyI7izmnHl_2I";

export default function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const fr = language !== "en";
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Google-only accounts have no password yet: they can set one without a current password.
  const hasPassword = useMemo(
    () => !!user?.identities?.some((i) => i.provider === "email") || user?.app_metadata?.provider === "email",
    [user],
  );

  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); setError(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ruleError = validatePassword(next, fr);
    if (ruleError) return setError(ruleError);
    if (next !== confirm) return setError(fr ? "Les mots de passe ne correspondent pas." : "Passwords do not match.");
    if (hasPassword && !current) return setError(fr ? "Saisissez votre mot de passe actuel." : "Enter your current password.");
    if (!user?.email) return setError(fr ? "Session invalide." : "Invalid session.");

    setSaving(true);
    try {
      if (hasPassword) {
        // Verify the current password with an isolated client so the active session is untouched.
        const verifier = createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "yima-pw-verify" },
        });
        const { error: verifyErr } = await verifier.auth.signInWithPassword({ email: user.email, password: current });
        if (verifyErr) {
          setSaving(false);
          return setError(fr ? "Mot de passe actuel incorrect." : "Current password is incorrect.");
        }
        await verifier.auth.signOut({ scope: "local" }).catch(() => {});
      }
      // Server also enforces its own password policy.
      const { error: updErr } = await supabase.auth.updateUser({ password: next });
      if (updErr) {
        setError(updErr.message);
      } else {
        toast({ title: fr ? "Mot de passe modifié" : "Password updated", description: fr ? "Vous restez connecté." : "You are still signed in." });
        reset();
        onOpenChange(false);
      }
    } catch {
      setError(fr ? "Une erreur est survenue. Réessayez." : "Something went wrong. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{hasPassword ? (fr ? "Changer le mot de passe" : "Change password") : (fr ? "Définir un mot de passe" : "Set a password")}</DialogTitle>
          <DialogDescription>
            {fr ? "8 caractères minimum, dont au moins un chiffre." : "At least 8 characters, including one number."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="cur-pw">{fr ? "Mot de passe actuel" : "Current password"}</Label>
              <Input id="cur-pw" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={saving} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="new-pw">{fr ? "Nouveau mot de passe" : "New password"}</Label>
            <Input id="new-pw" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} disabled={saving} maxLength={72} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conf-pw">{fr ? "Confirmer le nouveau mot de passe" : "Confirm new password"}</Label>
            <Input id="conf-pw" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={saving} maxLength={72} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {fr ? "Enregistrer" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
