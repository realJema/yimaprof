import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Loader2, CheckCircle, XCircle, Phone } from 'lucide-react';

// No timeout - wait indefinitely for webhook confirmation

export default function PaymentProcessing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { refreshSubscription } = useSubscription();
  const [status, setStatus] = useState<'initiating' | 'processing' | 'completed' | 'failed'>('initiating');
  const [countdown, setCountdown] = useState(5);
  const [transactionId, setTransactionId] = useState<string | null>(searchParams.get('transactionId'));
  
  const paymentInitiated = useRef(false);
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Payment params (from Payment.tsx when no transactionId yet)
  const planId = searchParams.get('planId');
  const phoneNumber = searchParams.get('phone') || '';
  const carrier = searchParams.get('carrier') as 'MTN' | 'ORANGE' | null;
  const amount = searchParams.get('amount');
  const referredBy = searchParams.get('referredBy');

  // Subscribe to transaction updates via Supabase Realtime
  const subscribeToTransaction = useCallback((txId: string) => {
    console.log('Subscribing to transaction updates:', txId);
    
    realtimeChannel.current = supabase
      .channel(`transaction-${txId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${txId}`
        },
        async (payload) => {
          console.log('Transaction update received:', payload);
          const newStatus = payload.new.status;
          
          if (newStatus === 'completed') {
            setStatus('completed');
            await refreshSubscription();
            toast({
              title: t('payment_success'),
              description: t('payment_success_desc'),
            });
          } else if (newStatus === 'failed') {
            setStatus('failed');
            const metadata = payload.new.metadata as { failure_reason?: string } | null;
            toast({
              title: t('payment_failed'),
              description: metadata?.failure_reason || t('payment_failed_desc'),
              variant: 'destructive',
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
  }, [t, toast, refreshSubscription]);

  // Cleanup realtime subscription
  const cleanupSubscription = useCallback(() => {
    if (realtimeChannel.current) {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(realtimeChannel.current);
      realtimeChannel.current = null;
    }
  }, []);

  // Initiate payment via edge function
  const initiatePayment = useCallback(async () => {
    if (!planId || !phoneNumber || !amount || !user) {
      console.error('Missing payment parameters');
      navigate('/subscriptions');
      return;
    }

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

    try {
      console.log('Initiating payment...', { planId, phoneNumber, amount, referredBy });
      
      const { data, error } = await supabase.functions.invoke('mesomb-payment', {
        body: {
          planId,
          phoneNumber,
          amount: parseInt(amount),
          referredBy: referredBy || null
        }
      });

      console.log('Payment initiation response:', { data, error });

      if (data?.transactionId) {
        setTransactionId(data.transactionId);
        
        // Handle test payment (already completed)
        if (data.status === 'completed' || data.testPayment) {
          setStatus('completed');
          await refreshSubscription();
          toast({
            title: t('payment_success'),
            description: t('payment_success_desc'),
          });
        } else {
          setStatus('processing');
          // Subscribe to realtime updates for this transaction
          subscribeToTransaction(data.transactionId);
        }
      } else {
        console.error('Payment initiation failed:', error || data);
        setStatus('failed');
        toast({
          title: t('payment_failed'),
          description: data?.error || error?.message || 'Failed to initiate payment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      setStatus('failed');
      toast({
        title: t('payment_failed'),
        description: 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      });
    }
  }, [planId, phoneNumber, amount, referredBy, user, navigate, subscribeToTransaction, t, toast, refreshSubscription]);

  // Main effect to handle payment flow
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // If we already have a transactionId (legacy flow), subscribe to updates
    if (transactionId && !paymentInitiated.current) {
      setStatus('processing');
      subscribeToTransaction(transactionId);
      paymentInitiated.current = true;
      return;
    }

    // If we have payment params but no transactionId, initiate payment
    if (planId && phoneNumber && amount && !paymentInitiated.current) {
      paymentInitiated.current = true;
      initiatePayment();
      return;
    }

    // No transactionId and no payment params - redirect
    if (!transactionId && !planId) {
      navigate('/subscriptions');
      return;
    }

    return () => {
      cleanupSubscription();
    };
  }, [user, transactionId, planId, phoneNumber, amount, navigate, initiatePayment, subscribeToTransaction, cleanupSubscription]);


  // Auto-redirect on success
  useEffect(() => {
    if (status === 'completed') {
      cleanupSubscription();
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            navigate('/exams2');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdownInterval);
    }
  }, [status, navigate, cleanupSubscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSubscription();
    };
  }, [cleanupSubscription]);

  const handleRetry = () => {
    cleanupSubscription();
    navigate('/subscriptions');
  };

  // Format phone number for display
  const formatPhone = (phone: string) => {
    if (phone.length === 9) {
      return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
    }
    return phone;
  };


  return (
    <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
      <div className="max-w-md mx-auto">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm text-center">
          <CardHeader>
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              {(status === 'initiating' || status === 'processing') && (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              )}
              {status === 'completed' && (
                <CheckCircle className="h-10 w-10 text-green-500" />
              )}
              {status === 'failed' && (
                <XCircle className="h-10 w-10 text-destructive" />
              )}
            </div>
            
            <CardTitle className="text-2xl">
              {status === 'initiating' && 'Initialisation du paiement...'}
              {status === 'processing' && 'Confirmez sur votre téléphone'}
              {status === 'completed' && t('payment_success')}
              {status === 'failed' && t('payment_failed')}
            </CardTitle>
            
            <CardDescription>
              {status === 'initiating' && (
                <span className="text-base">
                  Connexion au service de paiement...
                </span>
              )}
              {status === 'processing' && amount && (
                <span className="text-base">
                  Veuillez confirmer le paiement de <strong className="text-primary">{parseInt(amount).toLocaleString()} XAF</strong> sur votre téléphone
                </span>
              )}
              {status === 'completed' && (
                <span>Redirection vers les examens dans {countdown} secondes...</span>
              )}
              {status === 'failed' && t('payment_failed_desc')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {(status === 'initiating' || status === 'processing') && phoneNumber && (
              <>
                <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span className="font-mono text-lg">{formatPhone(phoneNumber)}</span>
                  {carrier && (
                    <Badge 
                      variant="secondary" 
                      className={carrier === 'MTN' 
                        ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' 
                        : 'bg-orange-500/20 text-orange-600 border-orange-500/30'
                      }
                    >
                      {carrier}
                    </Badge>
                  )}
                </div>

                {status === 'processing' && (
                  <>
                    
                    <p className="text-sm text-muted-foreground">
                      La page se mettra à jour automatiquement une fois le paiement confirmé
                    </p>
                  </>
                )}
              </>
            )}

            {status === 'completed' && (
              <Button onClick={() => navigate('/exams2')} className="w-full" size="lg">
                Accéder aux examens maintenant
              </Button>
            )}

            {status === 'failed' && (
              <Button onClick={handleRetry} className="w-full" size="lg">
                {t('try_again')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
