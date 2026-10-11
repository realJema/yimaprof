import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, ArrowRight } from 'lucide-react';

export default function AuthInvitation({ mode = 'signup' }: { mode?: 'signup' | 'signin' }) {
  const { language } = useLanguage();
  const location = useLocation();
  const fr = language === 'fr';
  const signup = mode === 'signup';
  const Icon = signup ? UserPlus : LogIn;
  const next = encodeURIComponent(`${location.pathname}${location.search}`);
  return (
    <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 px-5 py-7 text-center">
      <Icon className="mx-auto h-8 w-8 text-primary" />
      <h2 className="text-lg font-semibold">{signup ? (fr ? 'Bienvenue dans la communauté Yimaprof' : 'Welcome to the Yimaprof community') : (fr ? 'Heureux de vous retrouver' : 'Welcome back')}</h2>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">{signup ? (fr ? 'Créez votre compte gratuitement pour découvrir plus de contenu et avancer à votre rythme.' : 'Create your free account to discover more content and learn at your own pace.') : (fr ? 'Connectez-vous à votre compte pour continuer et retrouver votre parcours.' : 'Sign in to continue and pick up where you left off.')}</p>
      <Button asChild><Link to={`/auth?mode=${mode}&next=${next}`}><Icon className="mr-2 h-4 w-4" />{signup ? (fr ? 'S’inscrire gratuitement' : 'Register for free') : (fr ? 'Se connecter' : 'Sign in')}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      <p><Link className="text-sm text-primary underline underline-offset-4" to={`/auth?mode=${signup ? 'signin' : 'signup'}&next=${next}`}>{signup ? (fr ? 'Déjà un compte ? Se connecter' : 'Already registered? Sign in') : (fr ? 'Pas encore de compte ? Inscription gratuite' : 'New here? Register for free')}</Link></p>
    </div>
  );
}