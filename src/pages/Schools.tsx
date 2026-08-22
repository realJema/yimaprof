import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstablishment } from '@/hooks/useEstablishment';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SeoHead from '@/components/SeoHead';
import { PENDING_SCHOOL_KEY, type PendingSchool } from '@/components/school/SchoolSignupForm';
import { Award, BarChart3, Building2, Coins, GraduationCap, Route, Users } from 'lucide-react';

export default function Schools() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { establishment, isSchoolAdmin, loading, refresh } = useEstablishment();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'private', city: '', contact_email: '', contact_phone: '' });

  useEffect(() => {
    if (user?.email && !form.contact_email) setForm((f) => ({ ...f, contact_email: user.email as string }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Finish a registration started from the auth page (before email confirmation)
  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_SCHOOL_KEY);
    if (!user || loading || establishment || !raw) return;
    let pending: PendingSchool;
    try {
      pending = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(PENDING_SCHOOL_KEY);
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc('register_establishment', {
        p_name: pending.name,
        p_type: pending.type,
        p_city: pending.city || null,
        p_country: 'CM',
        p_contact_email: pending.contact_email || null,
        p_contact_phone: pending.contact_phone || null,
      });
      const result = data as { success?: boolean; error?: string } | null;
      if (error || !result?.success) {
        setForm({
          name: pending.name,
          type: pending.type,
          city: pending.city,
          contact_email: pending.contact_email,
          contact_phone: pending.contact_phone,
        });
        sessionStorage.removeItem(PENDING_SCHOOL_KEY);
        return;
      }
      sessionStorage.removeItem(PENDING_SCHOOL_KEY);
      toast({
        title: fr ? 'Établissement enregistré' : 'School registered',
        description: fr ? 'En attente d’approbation par un administrateur.' : 'Pending administrator approval.',
      });
      await refresh();
      navigate('/school');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, establishment]);

  const features = [
    { icon: BarChart3, title: fr ? 'Tableau de bord' : 'Dashboard', text: fr ? 'Vue d’ensemble des élèves, classes, moyennes et revenus.' : 'Overview of students, classes, averages and revenue.' },
    { icon: GraduationCap, title: fr ? 'Suivi des classes' : 'Class tracking', text: fr ? 'Moyennes par classe, enseignant référent et activité.' : 'Averages per class, lead teacher and activity.' },
    { icon: Award, title: 'Challenges', text: fr ? 'Défis inter-classes avec classements et récompenses.' : 'Inter-class challenges with rankings and rewards.' },
    { icon: Coins, title: fr ? 'Revenus & parrainage' : 'Revenue & referrals', text: fr ? 'Commissions sur les abonnements et retraits Mobile Money.' : 'Commissions on subscriptions and Mobile Money payouts.' },
    { icon: Route, title: fr ? 'Parcours élève' : 'Student journey', text: fr ? 'Leçons lues, temps passé et évaluations par élève.' : 'Lessons read, time spent and evaluations per student.' },
    { icon: Users, title: fr ? 'Résultats & statistiques' : 'Results & stats', text: fr ? 'Moyennes par matière et palmarès des élèves.' : 'Averages per subject and student rankings.' },
  ];

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 3) {
      toast({ title: fr ? 'Nom trop court' : 'Name too short', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc('register_establishment', {
      p_name: form.name.trim().slice(0, 150),
      p_type: form.type,
      p_city: form.city.trim().slice(0, 100) || null,
      p_country: 'CM',
      p_contact_email: form.contact_email.trim().slice(0, 255) || null,
      p_contact_phone: form.contact_phone.trim().slice(0, 30) || null,
    });
    setSubmitting(false);
    const result = data as { success?: boolean; error?: string } | null;
    if (error || !result?.success) {
      toast({ title: fr ? 'Inscription impossible' : 'Registration failed', description: error?.message || result?.error, variant: 'destructive' });
      return;
    }
    toast({
      title: fr ? 'Établissement enregistré' : 'School registered',
      description: fr ? 'En attente d’approbation par un administrateur.' : 'Pending administrator approval.',
    });
    await refresh();
    navigate('/school');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SeoHead
        title={fr ? 'Espace Établissement pour les écoles | Yimaprof' : 'Establishment Space for schools | Yimaprof'}
        description={
          fr
            ? 'Inscrivez votre établissement sur Yimaprof : suivi des classes, challenges, parcours élèves, statistiques et revenus de parrainage.'
            : 'Register your school on Yimaprof: class tracking, challenges, student journeys, statistics and referral revenue.'
        }
        path="/schools"
      />

      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold">
          {fr ? 'Espace Établissement' : 'Establishment Space'}
        </h1>
        <p className="text-muted-foreground mt-4">
          {fr
            ? 'Pilotez la réussite de vos élèves : suivez leurs révisions, animez des challenges entre classes et générez des revenus grâce au parrainage.'
            : 'Drive your students’ success: track revision, run inter-class challenges and earn referral revenue.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-14">
        {features.map((f) => (
          <Card key={f.title} className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <f.icon className="h-5 w-5 text-secondary" />{f.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="max-w-2xl mx-auto border-secondary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-5 w-5 text-secondary" />
            {fr ? 'Inscrire mon établissement' : 'Register my school'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : !user ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {fr ? 'Connectez-vous pour créer l’espace de votre établissement.' : 'Sign in to create your school space.'}
              </p>
              <Button asChild><Link to="/auth">{fr ? 'Se connecter / S’inscrire' : 'Sign in / Sign up'}</Link></Button>
            </div>
          ) : establishment && isSchoolAdmin ? (
            <div className="space-y-4">
              <p className="text-sm">
                {fr ? 'Votre établissement est déjà enregistré :' : 'Your school is already registered:'}{' '}
                <span className="font-semibold">{establishment.name}</span>
              </p>
              <Button asChild><Link to="/school">{fr ? 'Ouvrir mon espace' : 'Open my space'}</Link></Button>
            </div>
          ) : (
            <form onSubmit={register} className="space-y-4">
              <div>
                <Label htmlFor="sn">{fr ? 'Nom de l’établissement' : 'School name'}</Label>
                <Input id="sn" required minLength={3} maxLength={150} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>{fr ? 'Type' : 'Type'}</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">{fr ? 'Public' : 'Public'}</SelectItem>
                      <SelectItem value="private">{fr ? 'Privé' : 'Private'}</SelectItem>
                      <SelectItem value="international">{fr ? 'International' : 'International'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sc">{fr ? 'Ville' : 'City'}</Label>
                  <Input id="sc" maxLength={100} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="se">{fr ? 'Email de contact' : 'Contact email'}</Label>
                  <Input id="se" type="email" maxLength={255} value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="sp">{fr ? 'Téléphone' : 'Phone'}</Label>
                  <Input id="sp" maxLength={30} value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (fr ? 'Création…' : 'Creating…') : fr ? 'Créer mon espace établissement' : 'Create my school space'}
              </Button>
              <p className="text-xs text-muted-foreground">
                {fr
                  ? 'Un code de parrainage unique est généré automatiquement pour suivre les abonnements de vos élèves.'
                  : 'A unique referral code is generated automatically to track your students’ subscriptions.'}
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}