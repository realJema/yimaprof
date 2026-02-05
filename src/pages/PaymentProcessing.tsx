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

export default function PaymentProcessing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { refreshSubscription } = useSubscription();
  const [status, setStatus] = useState<'initiating' | 'processing' | 'completed' | 'failed'>('initiating');
  const [checkCount, setCheckCount] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [transactionId, setTransactionId] = useState<string | null>(searchParams.get('transactionId'));
  const [isManualChecking, setIsManualChecking] = useState(false);
  const maxChecks = 30; // Check for 5 minutes (30 checks * 10 seconds)
  const paymentInitiated = useRef(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Payment params (from Payment.tsx when no transactionId yet)
  const planId = searchParams.get('planId');
  const phoneNumber = searchParams.get('phone') || '';
  const carrier = searchParams.get('carrier') as 'MTN' | 'ORANGE' | null;
  const amount = searchParams.get('amount');
  const referredBy = searchParams.get('referredBy');

  // Check payment status function
  const checkPaymentStatus = useCallback(async (txId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: { transactionId: txId }
      });

      if (error) throw error;

      if (data.status === 'completed') {
        setStatus('completed');
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
        // Refresh subscription state immediately so browse page shows full content
        await refreshSubscription();
        toast({
          title: t('payment_success'),
          description: t('payment_success_desc'),
        });
      } else if (data.status === 'failed') {
        setStatus('failed');
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
        toast({
          title: t('payment_failed'),
          description: t('payment_failed_desc'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  }, [t, toast, refreshSubscription]);

  // Start polling for payment status
  const startPolling = useCallback((txId: string) => {
    // Immediate check
    checkPaymentStatus(txId);
    
    // Set up interval to check status every 10 seconds
    pollingInterval.current = setInterval(() => {
      setCheckCount(prev => {
        if (prev >= maxChecks) {
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
          }
          setStatus('failed');
          return prev;
        }
        checkPaymentStatus(txId);
        return prev + 1;
      });
    }, 10000);
  }, [checkPaymentStatus, maxChecks]);

  // Manual check handler - triggered when user clicks "I've confirmed"
  const handleManualCheck = async () => {
    if (isManualChecking) return;
    
    // If no transactionId yet (still initiating), show helpful message
    if (!transactionId) {
      toast({
        title: 'Paiement en cours d\'initialisation',
        description: 'Veuillez patienter quelques secondes puis réessayer.',
      });
      return;
    }
    
    setIsManualChecking(true);
    await checkPaymentStatus(transactionId);
    setIsManualChecking(false);
  };

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
        setStatus('processing');
        startPolling(data.transactionId);
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
  }, [planId, phoneNumber, amount, referredBy, user, navigate, startPolling, t, toast]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // If we already have a transactionId (legacy flow), just start polling
    if (transactionId && !paymentInitiated.current) {
      setStatus('processing');
      startPolling(transactionId);
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
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [user, transactionId, planId, phoneNumber, amount, navigate, initiatePayment, startPolling]);

  // Auto-redirect on success
  useEffect(() => {
    if (status === 'completed') {
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
  }, [status, navigate]);

  const handleRetry = () => {
    navigate('/subscriptions');
  };

  const handleGoToSubscriptions = () => {
    navigate('/subscriptions');
  };

  const handleGoToExams = () => {
    navigate('/exams2');
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
              {status === 'initiating' && 'Confirmez sur votre téléphone'}
              {status === 'processing' && 'Vérification du paiement...'}
              {status === 'completed' && t('payment_success')}
              {status === 'failed' && t('payment_failed')}
            </CardTitle>
            
            <CardDescription>
              {status === 'initiating' && amount && (
                <span className="text-base">
                  Veuillez confirmer le paiement de <strong className="text-primary">{parseInt(amount).toLocaleString()} XAF</strong> depuis MeSomb sur votre téléphone
                </span>
              )}
              {status === 'processing' && (
                <span className="text-xs text-muted-foreground">
                  Vérification #{checkCount + 1} sur {maxChecks}
                </span>
              )}
              {status === 'completed' && (
                <span>Redirection vers les examens dans {countdown} secondes...</span>
              )}
              {status === 'failed' && t('payment_failed_desc')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {status === 'initiating' && phoneNumber && (
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

                <Button 
                  onClick={handleManualCheck} 
                  disabled={isManualChecking}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  {isManualChecking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Vérification en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      J'ai confirmé le paiement
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Confirmez le paiement sur votre téléphone, puis cliquez sur le bouton ci-dessus
                </p>
              </>
            )}

            {status === 'processing' && phoneNumber && (
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

                <Button 
                  onClick={handleManualCheck} 
                  disabled={isManualChecking}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  {isManualChecking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Vérification en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      J'ai confirmé le paiement
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground">
                  La vérification automatique continue en arrière-plan
                </p>
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