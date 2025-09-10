import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Phone, CreditCard } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
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
  }, [user, planId, navigate]);

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
    // Simple validation for 9-digit numbers (no country code needed)
    const phoneRegex = /^[6-9]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handlePayment = async () => {
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
        title: 'Error',
        description: 'Please enter a valid 9-digit phone number starting with 6, 7, 8, or 9',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      console.log('Calling mesomb-payment function with:', {
        planId: plan.id,
        phoneNumber: phoneNumber.replace(/\s/g, ''),
        amount: plan.price
      });

      const { data, error } = await supabase.functions.invoke('mesomb-payment', {
        body: {
          planId: plan.id,
          phoneNumber: phoneNumber.replace(/\s/g, ''),
          amount: plan.price
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data && data.success) {
        if (data.testPayment) {
          // For test payments, show success immediately
          toast({
            title: 'Test Payment Successful!',
            description: 'Your subscription has been activated.',
          });
          navigate('/subscriptions');
        } else {
          // Navigate to payment processing page
          navigate(`/payment-processing?transactionId=${data.transactionId}`);
        }
      } else {
        console.error('Payment failed with data:', data);
        toast({
          title: 'Payment Failed',
          description: data?.error || 'Failed to initiate payment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process payment. Please try again.',
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
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10"
                  maxLength={9}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your 9-digit phone number (without country code)
                <br />
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