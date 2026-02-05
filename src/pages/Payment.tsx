import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Phone, CreditCard, UserCheck, Smartphone } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
}

// Detect carrier from phone number
function detectCarrier(phone: string): 'MTN' | 'ORANGE' | null {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 2) return null;
  
  const prefix = cleaned.substring(0, 2);
  
  // MTN Cameroon prefixes: 67, 68, 650-654
  if (['67', '68'].includes(prefix)) {
    return 'MTN';
  }
  if (prefix === '65' && cleaned.length >= 3) {
    const thirdDigit = cleaned.charAt(2);
    if (['0', '1', '2', '3', '4'].includes(thirdDigit)) {
      return 'MTN';
    }
    if (['5', '6', '7', '8', '9'].includes(thirdDigit)) {
      return 'ORANGE';
    }
  }
  
  // Orange Cameroon prefixes: 69, 655-659
  if (prefix === '69') {
    return 'ORANGE';
  }
  
  return null;
}

export default function Payment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [referrerUsername, setReferrerUsername] = useState<string | null>(null);
  const [detectedCarrier, setDetectedCarrier] = useState<'MTN' | 'ORANGE' | null>(null);
  const planId = searchParams.get('planId');

  useEffect(() => {
    console.log('Payment component mounted, user:', user, 'planId:', planId);
    
    if (!user) {
      console.log('No user, redirecting to auth');
      navigate('/auth');
      return;
    }

    if (!planId) {
      console.log('No planId, redirecting to subscriptions');
      navigate('/subscriptions');
      return;
    }

    fetchPlan();
    fetchReferrer();
  }, [user, planId, navigate]);

  const fetchReferrer = async () => {
    const referralAffiliateId = localStorage.getItem('referral_affiliate_id');
    if (!referralAffiliateId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', referralAffiliateId)
        .maybeSingle();

      if (data?.username) {
        setReferrerUsername(data.username);
      }
    } catch (error) {
      console.error('Error fetching referrer:', error);
    }
  };

  const fetchPlan = async () => {
    if (!planId) return;

    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setPlan(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load subscription plan',
        variant: 'destructive',
      });
      navigate('/subscriptions');
    }
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

  const validatePhoneNumber = (phone: string) => {
    // Validation for 9-digit Cameroon mobile numbers (MTN or Orange)
    const cleaned = phone.replace(/\s/g, '');
    if (!/^\d{9}$/.test(cleaned)) return false;
    
    const carrier = detectCarrier(cleaned);
    return carrier !== null;
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    const carrier = detectCarrier(value.replace(/\s/g, ''));
    setDetectedCarrier(carrier);
  };

  const handlePayment = () => {
    if (!plan || !user) return;

    if (!phoneNumber.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your phone number',
        variant: 'destructive',
      });
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid 9-digit Cameroon MTN or Orange number (starting with 67, 68, 69, or 65)',
        variant: 'destructive',
      });
      return;
    }

    // Handle test payment (670000000) synchronously
    const cleanedPhone = phoneNumber.replace(/\s/g, '');
    if (cleanedPhone === '670000000') {
      handleTestPayment();
      return;
    }

    // Navigate to processing page immediately with payment params
    const params = new URLSearchParams({
      planId: plan.id,
      phone: cleanedPhone,
      carrier: detectedCarrier || '',
      amount: plan.price.toString()
    });
    
    // Clear referral from localStorage before navigating
    const referralAffiliateId = localStorage.getItem('referral_affiliate_id');
    if (referralAffiliateId) {
      params.set('referredBy', referralAffiliateId);
      localStorage.removeItem('referral_affiliate_id');
    }
    
    navigate(`/payment-processing?${params.toString()}`);
  };

  const handleTestPayment = async () => {
    if (!plan || !user) return;
    
    setLoading(true);
    try {
      // Validate session before proceeding
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast({
          title: 'Session expirée',
          description: 'Veuillez vous reconnecter pour continuer le paiement.',
          variant: 'destructive',
        });
        navigate('/auth?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search));
        return;
      }

      const referralAffiliateId = localStorage.getItem('referral_affiliate_id');
      
      const { data, error } = await supabase.functions.invoke('mesomb-payment', {
        body: {
          planId: plan.id,
          phoneNumber: '670000000',
          amount: plan.price,
          referredBy: referralAffiliateId
        }
      });

      if (data?.success && data?.testPayment) {
        if (referralAffiliateId) {
          localStorage.removeItem('referral_affiliate_id');
        }
        toast({
          title: 'Test Payment Successful!',
          description: 'Your subscription has been activated.',
        });
        navigate('/subscriptions');
      } else {
        throw new Error(data?.error || 'Test payment failed');
      }
    } catch (error) {
      console.error('Test payment error:', error);
      toast({
        title: 'Error',
        description: 'Test payment failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-md mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/subscriptions')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Plans
        </Button>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Complete Payment</CardTitle>
            <CardDescription>
              Subscribe to {plan.name} plan
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {referrerUsername && (
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <UserCheck className="h-5 w-5" />
                  <span className="font-semibold">Referred by</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    @{referrerUsername}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    will earn a commission from your subscription
                  </span>
                </div>
              </div>
            )}

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{plan.name}</span>
                <span className="text-lg font-bold">
                  {formatPrice(plan.price, plan.currency)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Monthly subscription</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="6XX XXX XXX"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="pl-10"
                  maxLength={9}
                />
                {detectedCarrier && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Badge 
                      variant="secondary" 
                      className={detectedCarrier === 'MTN' ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' : 'bg-orange-500/20 text-orange-600 border-orange-500/30'}
                    >
                      {detectedCarrier}
                    </Badge>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                🇨🇲 Only Cameroon numbers accepted
              </p>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                  <Smartphone className="h-3 w-3 mr-1" />
                  MTN: 67, 68, 650-654
                </Badge>
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                  <Smartphone className="h-3 w-3 mr-1" />
                  Orange: 69, 655-659
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">Use 670000000 for testing</span>
              </p>
            </div>

            <Button
              onClick={handlePayment}
              disabled={loading || !phoneNumber.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? 'Processing...' : `Pay ${formatPrice(plan.price, plan.currency)}`}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              <p>Secure payment powered by MeSomb</p>
              <p>Supports Orange Money and MTN Mobile Money</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}