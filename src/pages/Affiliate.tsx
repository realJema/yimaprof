import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Copy, DollarSign, Users, TrendingUp, Check, Loader2, Clock, XCircle, Send } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface AffiliateEarning {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  referred_user: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

interface AffiliateApplication {
  id: string;
  status: string;
  rejection_reason: string | null;
  applied_at: string;
  reviewed_at: string | null;
}

export default function Affiliate() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [earnings, setEarnings] = useState<AffiliateEarning[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referredByUsername, setReferredByUsername] = useState<string | null>(null);
  const [application, setApplication] = useState<AffiliateApplication | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchApplication(),
      fetchProfile(),
      fetchReferredBy(),
    ]);
    setLoading(false);
  };

  const fetchApplication = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_applications')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      setApplication(data);
      
      // If approved, fetch earnings
      if (data?.status === 'approved') {
        await fetchEarnings();
      }
    } catch (error) {
      console.error('Error fetching application:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      if (data?.username) {
        setCurrentUsername(data.username);
        setUsername(data.username);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchEarnings = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_earnings')
        .select(`
          *,
          referred_user:profiles!affiliate_earnings_referred_user_id_fkey(
            email,
            first_name,
            last_name
          )
        `)
        .eq('affiliate_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEarnings(data || []);
      
      const total = data?.reduce((sum, earning) => {
        if (earning.status === 'paid' || earning.status === 'pending') {
          return sum + earning.amount;
        }
        return sum;
      }, 0) || 0;
      
      setTotalEarnings(total);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    }
  };

  const fetchReferredBy = async () => {
    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select(`
          referred_by,
          referrer:profiles!subscriptions_referred_by_fkey(username)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;

      if (subscription?.referrer?.username) {
        setReferredByUsername(subscription.referrer.username);
      }
    } catch (error) {
      console.error('Error fetching referrer:', error);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const { error } = await supabase
        .from('affiliate_applications')
        .insert({
          user_id: user?.id,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: language === 'fr' ? 'Candidature envoyée!' : 'Application submitted!',
        description: language === 'fr' 
          ? 'Votre candidature est en cours d\'examen. Nous vous contacterons bientôt.'
          : 'Your application is under review. We will contact you soon.',
      });

      fetchApplication();
    } catch (error: any) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' ? 'Le nom d\'utilisateur ne peut pas être vide' : 'Username cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' 
          ? 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores' 
          : 'Username can only contain letters, numbers, dashes and underscores',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.toLowerCase() })
        .eq('id', user?.id);

      if (error) {
        if (error.code === '23505') {
          throw new Error(language === 'fr' ? 'Ce nom d\'utilisateur est déjà pris' : 'Username already taken');
        }
        throw error;
      }

      setCurrentUsername(username.toLowerCase());
      setIsEditing(false);
      toast({
        title: language === 'fr' ? 'Succès' : 'Success',
        description: language === 'fr' ? 'Nom d\'utilisateur enregistré' : 'Username saved successfully',
      });
    } catch (error: any) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: error.message || (language === 'fr' ? 'Échec de la sauvegarde' : 'Failed to save username'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getAffiliateLink = () => {
    return `${window.location.origin}/subscriptions?ref=${currentUsername}`;
  };

  const copyAffiliateLink = () => {
    navigator.clipboard.writeText(getAffiliateLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: language === 'fr' ? 'Copié!' : 'Copied!',
      description: language === 'fr' ? 'Lien copié dans le presse-papier' : 'Link copied to clipboard',
    });
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: language === 'fr' ? fr : enUS,
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              {language === 'fr' ? 'Veuillez vous connecter pour accéder à cette page' : 'Please sign in to access this page'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No application yet - show apply form
  if (!application) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card className="border-border/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'fr' ? 'Programme d\'Affiliation' : 'Affiliate Program'}
            </CardTitle>
            <CardDescription className="text-base">
              {language === 'fr' 
                ? 'Gagnez 10% de commission sur chaque premier abonnement de vos filleuls!'
                : 'Earn 10% commission on each first subscription from your referrals!'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">{language === 'fr' ? 'Comment ça marche:' : 'How it works:'}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  {language === 'fr' ? 'Postulez pour devenir affilié' : 'Apply to become an affiliate'}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  {language === 'fr' ? 'Attendez l\'approbation de votre candidature' : 'Wait for your application to be approved'}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  {language === 'fr' ? 'Partagez votre lien unique' : 'Share your unique link'}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">4.</span>
                  {language === 'fr' ? 'Gagnez 10% sur chaque premier abonnement' : 'Earn 10% on each first subscription'}
                </li>
              </ul>
            </div>

            <Button 
              className="w-full gap-2" 
              size="lg"
              onClick={handleApply}
              disabled={isApplying}
            >
              {isApplying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {language === 'fr' ? 'Postuler Maintenant' : 'Apply Now'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Application pending
  if (application.status === 'pending') {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'fr' ? 'Candidature en cours d\'examen' : 'Application Under Review'}
            </CardTitle>
            <CardDescription className="text-base">
              {language === 'fr' 
                ? 'Votre candidature est en cours de traitement. Nous vous informerons dès qu\'elle sera examinée.'
                : 'Your application is being processed. We will notify you once it has been reviewed.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {language === 'fr' ? 'Soumis' : 'Submitted'} {formatDate(application.applied_at)}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Application rejected
  if (application.status === 'rejected') {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'fr' ? 'Candidature Rejetée' : 'Application Rejected'}
            </CardTitle>
            <CardDescription className="text-base">
              {language === 'fr' 
                ? 'Malheureusement, votre candidature n\'a pas été approuvée.'
                : 'Unfortunately, your application was not approved.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {application.rejection_reason && (
              <div className="bg-background rounded-lg p-4 border">
                <p className="text-sm font-medium mb-1">{language === 'fr' ? 'Raison:' : 'Reason:'}</p>
                <p className="text-sm text-muted-foreground">{application.rejection_reason}</p>
              </div>
            )}
            <p className="text-sm text-center text-muted-foreground">
              {language === 'fr' 
                ? 'Si vous pensez qu\'il s\'agit d\'une erreur, veuillez nous contacter.'
                : 'If you believe this is a mistake, please contact us.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Approved - show full affiliate dashboard
  const paidEarnings = earnings.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  const pendingEarnings = earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const referralCount = earnings.length;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-4xl font-bold text-primary">
            {language === 'fr' ? 'Programme d\'Affiliation' : 'Affiliate Program'}
          </h1>
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            {language === 'fr' ? 'Approuvé' : 'Approved'}
          </Badge>
        </div>
        <p className="text-muted-foreground text-lg">
          {language === 'fr' 
            ? 'Gagnez 10% de commission sur chaque premier abonnement de vos filleuls' 
            : 'Earn 10% commission on each first subscription from your referrals'}
        </p>
        {referralCount > 0 && (
          <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-primary">
              {language === 'fr' 
                ? `💰 Vos filleuls ont généré ${totalEarnings.toLocaleString()} XOF de commissions au total` 
                : `💰 Your referrals generated ${totalEarnings.toLocaleString()} XOF in total commissions`}
            </p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {language === 'fr' ? 'Total Gagné' : 'Total Earned'}
                </p>
                <p className="text-2xl font-bold text-primary">{totalEarnings.toLocaleString()} XOF</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {language === 'fr' ? 'En Attente' : 'Pending'}
                </p>
                <p className="text-2xl font-bold text-amber-600">{pendingEarnings.toLocaleString()} XOF</p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {language === 'fr' ? 'Filleuls' : 'Referrals'}
                </p>
                <p className="text-2xl font-bold">{referralCount}</p>
              </div>
              <Users className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referred By Section */}
      {referredByUsername && (
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Check className="h-5 w-5" />
              {language === 'fr' ? 'Vous avez été parrainé par' : 'You were referred by'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-base px-4 py-2">
                @{referredByUsername}
              </Badge>
              <p className="text-muted-foreground">
                {language === 'fr' 
                  ? 'Merci de soutenir cet affilié!' 
                  : 'Thank you for supporting this affiliate!'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Affiliate Link Section */}
      <Card className="mb-8 border-border/50">
        <CardHeader>
          <CardTitle>{language === 'fr' ? 'Votre Lien d\'Affiliation' : 'Your Affiliate Link'}</CardTitle>
          <CardDescription>
            {language === 'fr' 
              ? 'Partagez ce lien pour gagner des commissions' 
              : 'Share this link to earn commissions'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!currentUsername || isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'fr' ? 'Choisissez votre nom d\'utilisateur' : 'Choose your username'}
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder={language === 'fr' ? 'nomutilisateur' : 'username'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className="flex-1"
                  />
                  <Button onClick={handleSaveUsername} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : language === 'fr' ? 'Sauvegarder' : 'Save'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {language === 'fr' 
                    ? 'Lettres, chiffres, tirets et underscores uniquement' 
                    : 'Letters, numbers, dashes and underscores only'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <code className="flex-1 text-sm break-all">{getAffiliateLink()}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAffiliateLink}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                {language === 'fr' ? 'Changer le nom d\'utilisateur' : 'Change username'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>{language === 'fr' ? 'Historique des Gains' : 'Earnings History'}</CardTitle>
          <CardDescription>
            {language === 'fr' 
              ? 'Tous vos gains d\'affiliation' 
              : 'All your affiliate earnings'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'fr' 
                  ? 'Aucun filleul pour le moment. Partagez votre lien pour commencer à gagner!' 
                  : 'No referrals yet. Share your link to start earning!'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'fr' ? 'Filleul' : 'Referral'}</TableHead>
                    <TableHead>{language === 'fr' ? 'Montant' : 'Amount'}</TableHead>
                    <TableHead>{language === 'fr' ? 'Statut' : 'Status'}</TableHead>
                    <TableHead>{language === 'fr' ? 'Date' : 'Date'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell>
                        {earning.referred_user?.first_name || earning.referred_user?.last_name 
                          ? `${earning.referred_user.first_name || ''} ${earning.referred_user.last_name || ''}`.trim()
                          : earning.referred_user?.email || 'Unknown'}
                      </TableCell>
                       <TableCell>
                        <div>
                          <p className="font-medium">{earning.amount.toLocaleString()} {earning.currency}</p>
                          <p className="text-xs text-muted-foreground">
                            {language === 'fr' ? '(10% commission)' : '(10% commission)'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          earning.status === 'paid' ? 'default' : 
                          earning.status === 'pending' ? 'secondary' : 
                          'destructive'
                        }>
                          {earning.status === 'paid' 
                            ? (language === 'fr' ? 'Payé' : 'Paid')
                            : earning.status === 'pending'
                            ? (language === 'fr' ? 'En attente' : 'Pending')
                            : (language === 'fr' ? 'Annulé' : 'Cancelled')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(earning.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
