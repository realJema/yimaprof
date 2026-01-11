import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, CheckCircle, XCircle, Phone, Smartphone } from 'lucide-react';

export default function PaymentProcessing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [status, setStatus] = useState<'initiating' | 'processing' | 'completed' | 'failed'>('initiating');
  const [checkCount, setCheckCount] = useState(0);
  const [transactionId, setTransactionId] = useState<string | null>(searchParams.get('transactionId'));
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
  }, [t, toast]);

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

  // Initiate payment via edge function
  const initiatePayment = useCallback(async () => {
    if (!planId || !phoneNumber || !amount || !user) {
      console.error('Missing payment parameters');
      navigate('/subscriptions');
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

  const handleRetry = () => {
    navigate('/subscriptions');
  };

  const handleGoToSubscriptions = () => {
    navigate('/subscriptions');
  };

  const handleGoToExams = () => {
    navigate('/exams');
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
              {status === 'initiating' && 'Envoi en cours...'}
              {status === 'processing' && t('payment_processing')}
              {status === 'completed' && t('payment_success')}
              {status === 'failed' && t('payment_failed')}
            </CardTitle>
            
            <CardDescription>
              {status === 'initiating' && (
                <span>Envoi de la demande de paiement à votre téléphone...</span>
              )}
              {status === 'processing' && (
                <>
                  {t('payment_processing_desc')}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {t('check')} #{checkCount + 1} {t('of')} {maxChecks}
                  </span>
                </>
              )}
              {status === 'completed' && t('payment_success_desc')}
              {status === 'failed' && t('payment_failed_desc')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {status === 'initiating' && (
              <div className="space-y-4">
                {/* Phone number and carrier info */}
                {phoneNumber && (
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
                )}
                
                <p className="text-sm text-muted-foreground">
                  Veuillez patienter pendant que nous envoyons la demande de paiement...
                </p>
              </div>
            )}

            {status === 'processing' && (
              <div className="space-y-4">
                {/* Prominent phone confirmation message */}
                <div className="bg-primary/10 border-2 border-primary/30 p-4 rounded-lg animate-pulse">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Smartphone className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg text-primary">
                      Confirmez sur votre téléphone
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Une demande de paiement a été envoyée
                  </p>
                </div>
                
                {/* Phone number and carrier info */}
                {phoneNumber && (
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
                )}

                {/* Instructions */}
                <div className="bg-muted/50 p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2">{t('what_to_do_next')}</p>
                  <ol className="text-left space-y-2 list-decimal list-inside">
                    <li className="flex items-start gap-2">
                      <span className="shrink-0">1.</span>
                      <span>{t('check_phone_notification')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="shrink-0">2.</span>
                      <span>{t('enter_pin')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="shrink-0">3.</span>
                      <span>{t('confirm_amount')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="shrink-0">4.</span>
                      <span>{t('wait_confirmation')}</span>
                    </li>
                  </ol>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => navigate('/subscriptions')}
                  className="w-full"
                >
                  {t('cancel')}
                </Button>
              </div>
            )}

            {status === 'completed' && (
              <div className="space-y-3">
                <Button onClick={handleGoToSubscriptions} className="w-full" size="lg">
                  {t('go_to_subscriptions')}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleGoToExams}
                  className="w-full"
                  size="lg"
                >
                  {t('go_to_exams')}
                </Button>
              </div>
            )}

            {status === 'failed' && (
              <div className="space-y-3">
                <Button onClick={handleRetry} className="w-full" size="lg">
                  {t('try_again')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/subscriptions')}
                  className="w-full"
                >
                  {t('back_to_plans')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}