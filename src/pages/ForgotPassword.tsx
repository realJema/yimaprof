import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { canRequestReset } from "@/lib/passwordPolicy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

const emailSchema = z.string().trim().email().max(255);

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const fr = language === "fr";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: t('error'), description: fr ? "Adresse email invalide." : "Invalid email address.", variant: "destructive" });
      return;
    }
    const normalized = parsed.data.toLowerCase();
    if (!canRequestReset(normalized)) {
      toast({
        title: fr ? "Trop de demandes" : "Too many requests",
        description: fr ? "Veuillez patienter une heure avant de refaire une demande." : "Please wait an hour before trying again.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      // Errors (unknown email, etc.) are intentionally hidden: same message for everyone.
      await supabase.auth.resetPasswordForEmail(normalized, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      /* generic response below */
    }
    setEmailSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/auth")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {t('forgot_password')}
          </CardTitle>
          <CardDescription className="text-center">
            {emailSent 
              ? t('reset_email_sent_description')
              : t('forgot_password_description')
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {fr
                  ? "Si un compte existe avec cette adresse, vous recevrez un lien sécurisé (valable une seule fois, pendant une durée limitée). Pensez à vérifier vos spams."
                  : "If an account exists for this address, you'll receive a secure link (single-use, time-limited). Check your spam folder too."}
              </p>
              <Button
                onClick={() => navigate("/auth")}
                className="w-full"
              >
                {t('back_to_login')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('send_reset_link')}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/auth")}
                disabled={loading}
              >
                {t('back_to_login')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
