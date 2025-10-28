import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Copy, DollarSign, Users, TrendingUp, Check, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchEarnings();
    }
  }, [user]);

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
      } else {
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
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

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' ? 'Le nom d\'utilisateur ne peut pas être vide' : 'Username cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    // Validate username format (alphanumeric, dashes, underscores only)
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

  const paidEarnings = earnings.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  const pendingEarnings = earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const referralCount = earnings.length;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">
          {language === 'fr' ? 'Programme d\'Affiliation' : 'Affiliate Program'}
        </h1>
        <p className="text-muted-foreground text-lg">
          {language === 'fr' 
            ? 'Gagnez 10% de commission sur chaque premier abonnement de vos filleuls' 
            : 'Earn 10% commission on each first subscription from your referrals'}
        </p>
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
          {isEditing ? (
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
                      <TableCell className="font-medium">
                        {earning.amount.toLocaleString()} {earning.currency}
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
