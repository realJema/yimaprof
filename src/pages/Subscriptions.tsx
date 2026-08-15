import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SeoHead from '@/components/SeoHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useEstablishment } from '@/hooks/useEstablishment';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, Crown, Globe, BookOpen, Zap, UserPlus, Loader2, Search, Sparkles, GraduationCap } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration_days: number;
  features: string[] | any; // Handle JSON features
  max_downloads: number;
  is_active: boolean;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string;
  subscription_plans: SubscriptionPlan;
}

export default function Subscriptions() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subscription: userSubscription, loading: subscriptionLoading, refreshSubscription } = useSubscription();
  const { isSchoolAdmin, loading: establishmentLoading } = useEstablishment();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [referralUsername, setReferralUsername] = useState('');
  const [referredByProfile, setReferredByProfile] = useState<{ id: string; username: string } | null>(null);
  const [searchResults, setSearchResults] = useState<{ id: string; username: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'trimester' | 'annual'>('monthly');

  useEffect(() => {
    fetchPlans();
    refreshSubscription(); // Refresh subscription when page mounts

  }, []);

  // School accounts don't use personal subscriptions
  useEffect(() => {
    if (!establishmentLoading && isSchoolAdmin) {
      navigate('/school', { replace: true });
    }
  }, [establishmentLoading, isSchoolAdmin, navigate]);

  useEffect(() => {
    // Check for referral code in URL
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralUsername(refCode);
      validateReferral(refCode);
    }

    // Click outside handler for dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const searchUsernames = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_affiliate_usernames', {
        _term: searchTerm,
      });

      if (!error && data) {
        setSearchResults(data);
        setShowDropdown(data.length > 0);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error searching usernames:', error);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  const validateReferral = async (username: string) => {
    if (!username) {
      setReferredByProfile(null);
      return;
    }

    try {
      const { data: matches, error } = await supabase.rpc('find_affiliate_by_username', {
        _username: username.toLowerCase(),
      });
      const data = matches?.[0];

      if (error || !data) {
        setReferredByProfile(null);
        return;
      }

      // Prevent self-referral
      if (user && data.id === user.id) {
        toast({
          title: t('error'),
          description: t('cannot_refer_yourself'),
          variant: 'destructive',
        });
        setReferredByProfile(null);
        setReferralUsername('');
        return;
      }

      setReferredByProfile(data);
    } catch (error) {
      setReferredByProfile(null);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      const processedPlans = (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features as string)
      }));
      setPlans(processedPlans);
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failed_fetch_plans'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  const handleSubscribe = async (planId: string) => {
    console.log('Subscribe button clicked for plan:', planId);
    
    if (!user) {
      console.log('User not authenticated, showing toast');
      toast({
        title: t('error'),
        description: t('auth_required_subscribe'),
        variant: 'destructive',
      });
      return;
    }

    // Store referral info if valid
    if (referredByProfile?.id) {
      localStorage.setItem('referral_affiliate_id', referredByProfile.id);
    }

    console.log('Navigating to payment page with planId:', planId);
    // Navigate to payment page with plan ID using React Router
    navigate(`/payment?planId=${planId}`);
  };

  const handleReferralChange = (value: string) => {
    setReferralUsername(value);
    setReferredByProfile(null);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchUsernames(value);
    }, 300);
  };

  const selectUsername = (profile: { id: string; username: string }) => {
    setReferralUsername(profile.username);
    setReferredByProfile(profile);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'XOF') {
      return `${price.toLocaleString('fr-FR')} FCFA`;
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  const getPlanIcon = (planName: string) => {
    if (planName.includes('Everything')) return Crown;
    if (planName.includes('Prépa') || planName.toLowerCase().includes('prepa')) return GraduationCap;
    if (planName.includes('Anglophone')) return Globe;
    if (planName.includes('Francophone')) return BookOpen;
    return Zap;
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <p className="text-muted-foreground">{t('loading')}...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <SeoHead
        title="Abonnements — Yimaprof"
        description="Plans mensuels, trimestriels (-10%) et annuels (-20%) pour accéder à toutes les épreuves corrigées et aux évaluations Yimaprof."
        path="/subscriptions"
      />
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              {t('choose_your_plan')}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('subscription_page_desc')}
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                billingCycle === 'monthly'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {t('monthly')}
            </button>
            <button
              onClick={() => setBillingCycle('trimester')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                billingCycle === 'trimester'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {t('trimester')}
              <Badge className="ml-2 bg-green-500 text-white hover:bg-green-600 text-xs">
                -10%
              </Badge>
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                billingCycle === 'annual'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {t('annual')}
              <Badge className="ml-2 bg-green-500 text-white hover:bg-green-600 text-xs">
                -20%
              </Badge>
            </button>
          </div>
        </div>

        {!userSubscription && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {t('referred_by_someone')}
              </CardTitle>
              <CardDescription>
                {t('support_them')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="referral">{t('referral_username')}</Label>
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="referral"
                      placeholder={t('enter_username')}
                      value={referralUsername}
                      onChange={(e) => handleReferralChange(e.target.value)}
                      className="pl-10"
                      autoComplete="off"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Dropdown with search results */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((profile) => (
                        <button
                          key={profile.id}
                          onClick={() => selectUsername(profile)}
                          className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center gap-2 border-b border-border last:border-b-0"
                        >
                          <UserPlus className="h-4 w-4 text-primary" />
                          <span className="font-medium">@{profile.username}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {referredByProfile && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      {t('valid_referral')}: <span className="font-semibold">@{referredByProfile.username}</span>
                    </p>
                  </div>
                )}
                
                {referralUsername && !referredByProfile && !isSearching && searchResults.length === 0 && referralUsername.length >= 2 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {t('username_not_found')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {userSubscription && (
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <Crown className="h-5 w-5" />
                {t('current_subscription')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{userSubscription.subscription_plans.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('expires')}: {new Date(userSubscription.expires_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('started')}: {new Date(userSubscription.started_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                  </p>
                </div>
                <Badge variant="secondary">{t('active')}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = getPlanIcon(plan.name);
            const isCurrentPlan = userSubscription?.plan_id === plan.id;
            const isEverything = plan.name.includes('Everything');
            const isPrepa = plan.name.includes('Prépa') || plan.name.toLowerCase().includes('prepa');
            
            return (
              <Card 
                key={plan.id} 
                className={`relative border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-all ${
                  isPrepa ? 'border-secondary border-2 shadow-2xl shadow-secondary/30 scale-105 ring-2 ring-secondary/40' :
                  isEverything ? 'border-primary shadow-lg' : ''
                } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
              >
              {isPrepa && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-secondary text-secondary-foreground px-3 py-1 shadow-md flex items-center gap-1 italic font-extrabold">
                      <Sparkles className="h-3 w-3" />
                      {language === 'fr' ? 'Spécial Examen' : 'Exam Special'}
                    </Badge>
                  </div>
                )}
              {isEverything && !isPrepa && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
                      {t('most_popular')}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isPrepa ? 'bg-secondary/15' : 'bg-primary/10'}`}>
                    <Icon className={`h-8 w-8 ${isPrepa ? 'text-secondary' : 'text-primary'}`} />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {plan.description}
                  </CardDescription>
                  <div className="pt-4">
                    <span className="text-3xl font-bold text-foreground">
                      {formatPrice(
                        billingCycle === 'trimester' 
                          ? Math.floor(plan.price * 3 * 0.9) 
                          : billingCycle === 'annual' 
                            ? Math.floor(plan.price * 9 * 0.8) 
                            : plan.price,
                        plan.currency
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {billingCycle === 'trimester' 
                        ? ` / 3 ${t('months')}` 
                        : billingCycle === 'annual' 
                          ? ` / 9 ${t('months')}` 
                          : `/${t('month')}`}
                    </span>
                    {billingCycle !== 'monthly' && (
                      <div className="mt-2">
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(
                            billingCycle === 'trimester' 
                              ? plan.price * 3 
                              : plan.price * 9, 
                            plan.currency
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscribing === plan.id || isCurrentPlan}
                    className={`w-full ${isPrepa ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90' : isEverything ? 'bg-primary hover:bg-primary/90' : ''}`}
                    variant={isPrepa || isEverything ? 'default' : 'outline'}
                  >
                    {subscribing === plan.id ? (
                      t('processing')
                    ) : isCurrentPlan ? (
                      t('current_plan')
                    ) : userSubscription ? (
                      userSubscription.subscription_plans.price < plan.price ? t('upgrade') : 
                      userSubscription.subscription_plans.price > plan.price ? t('downgrade') : t('switch_plan')
                    ) : (
                      t('subscribe_to_plan')
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center pt-8">
          <p className="text-sm text-muted-foreground">
            {t('all_plans_include')}
          </p>
        </div>
      </div>
    </div>
  );
}