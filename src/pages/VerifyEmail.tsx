import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';

export default function VerifyEmail() {
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  // If user is already verified (email_confirmed_at exists), redirect to dashboard
  useEffect(() => {
    if (user && !loading) {
      // Check if email is confirmed
      if (user.email_confirmed_at) {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="h-4 w-4" />
            {language === 'fr' ? 'Retour à l\'accueil' : 'Back to home'}
          </Link>
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">YIMA</h1>
          </div>
        </div>

        <Card className="shadow-medium">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'fr' ? 'Vérifiez votre email' : 'Verify your email'}
            </CardTitle>
            <CardDescription className="text-base">
              {language === 'fr' 
                ? 'Nous avons envoyé un lien de confirmation à votre adresse email'
                : 'We\'ve sent a confirmation link to your email address'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {language === 'fr' 
                    ? 'Ouvrez l\'email que nous vous avons envoyé'
                    : 'Open the email we sent you'}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {language === 'fr' 
                    ? 'Cliquez sur le lien de confirmation'
                    : 'Click the confirmation link'}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {language === 'fr' 
                    ? 'Vous serez automatiquement connecté'
                    : 'You\'ll be automatically logged in'}
                </p>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {language === 'fr' 
                  ? 'Vous n\'avez pas reçu l\'email? Vérifiez vos spams.'
                  : 'Didn\'t receive the email? Check your spam folder.'}
              </p>
              
              <Link to="/auth">
                <Button variant="outline" className="w-full">
                  {language === 'fr' ? 'Retour à la connexion' : 'Back to login'}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
