import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Building2, Eye, EyeOff } from 'lucide-react';

export const PENDING_SCHOOL_KEY = 'pending_school_registration';

export interface PendingSchool {
  name: string;
  type: string;
  city: string;
  contact_email: string;
  contact_phone: string;
}

export default function SchoolSignupForm() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    schoolName: '',
    type: 'private',
    city: '',
    contactPhone: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.schoolName.trim().length < 3) {
      toast({ title: fr ? 'Nom d’établissement trop court' : 'School name too short', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const pending: PendingSchool = {
      name: form.schoolName.trim().slice(0, 150),
      type: form.type,
      city: form.city.trim().slice(0, 100),
      contact_email: form.email.trim().slice(0, 255),
      contact_phone: form.contactPhone.trim().slice(0, 30),
    };
    sessionStorage.setItem(PENDING_SCHOOL_KEY, JSON.stringify(pending));

    const { error } = await signUp(form.email, form.password, {
      first_name: form.firstName,
      last_name: form.lastName,
      role: 'teacher',
      phone: form.contactPhone || null,
    });
    setSubmitting(false);
    if (error) {
      sessionStorage.removeItem(PENDING_SCHOOL_KEY);
      return;
    }
    toast({
      title: fr ? 'Compte créé' : 'Account created',
      description: fr
        ? 'Confirmez votre email, puis votre espace établissement sera créé automatiquement.'
        : 'Confirm your email, then your school space will be created automatically.',
    });
    navigate('/verify-email');
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg bg-secondary/10 border border-secondary/30 p-3 text-xs text-muted-foreground flex gap-2">
        <Building2 className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
        <span>
          {fr
            ? 'Créez le compte administrateur de votre établissement : suivi des classes, challenges, résultats et revenus de parrainage.'
            : 'Create your school admin account: class tracking, challenges, results and referral revenue.'}
        </span>
      </div>

      <div>
        <Label htmlFor="asn">{fr ? 'Nom de l’établissement' : 'School name'}</Label>
        <Input id="asn" required minLength={3} maxLength={150} value={form.schoolName} onChange={(e) => set('schoolName', e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>{fr ? 'Type' : 'Type'}</Label>
          <Select value={form.type} onValueChange={(v) => set('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">{fr ? 'Public' : 'Public'}</SelectItem>
              <SelectItem value="private">{fr ? 'Privé' : 'Private'}</SelectItem>
              <SelectItem value="international">International</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="asc">{fr ? 'Ville' : 'City'}</Label>
          <Input id="asc" maxLength={100} value={form.city} onChange={(e) => set('city', e.target.value)} />
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="afn">{fr ? 'Prénom du responsable' : 'Admin first name'}</Label>
          <Input id="afn" required maxLength={80} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="aln">{fr ? 'Nom du responsable' : 'Admin last name'}</Label>
          <Input id="aln" required maxLength={80} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="aem">{fr ? 'Email de contact' : 'Contact email'}</Label>
          <Input id="aem" type="email" required maxLength={255} value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="aph">{fr ? 'Téléphone' : 'Phone'}</Label>
          <Input id="aph" maxLength={30} value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="apw">{fr ? 'Mot de passe' : 'Password'}</Label>
        <div className="relative">
          <Input
            id="apw"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={6}
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label={fr ? 'Afficher le mot de passe' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
        {submitting ? (fr ? 'Création…' : 'Creating…') : fr ? 'Créer mon espace établissement' : 'Create my school space'}
      </Button>
      <p className="text-xs text-muted-foreground">
        {fr
          ? 'Un code de parrainage unique est généré pour suivre les abonnements de vos élèves.'
          : 'A unique referral code is generated to track your students’ subscriptions.'}
      </p>
    </form>
  );
}
