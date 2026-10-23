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
import { usePaymentTracking } from '@/hooks/usePaymentTracking';
import { refreshPaymentAccess } from '@/lib/paymentAccessRefresh';
import { paymentFailureGuidance, type PaymentFailureGuidance } from '@/lib/paymentFailureGuidance';
import { Loader2, CheckCircle, Phone, AlertTriangle, RefreshCw, MessageCircle, LifeBuoy, ListChecks } from 'lucide-react';

const TIMEOUT_SECONDS = 90;

export default function PaymentProcessing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { refreshSubscription } = useSubscription();
  const [status, setStatus] = useState<'initiating' | 'processing' | 'completed' | 'failed' | 'timeout'>('initiating');
  const [accessReady, setAccessReady] = useState(false);
  const [refreshingAccess, setRefreshingAccess] = useState(false);
  const [accessRefreshAttempt, setAccessRefreshAttempt] = useState(0);
  const [transactionId, setTransactionId] = useState<string | null>(searchParams.get('transactionId'));
  const [verifying, setVerifying] = useState(false);
  const [guidance, setGuidance] = useState<PaymentFailureGuidance | null>(null);
  
  const paymentInitiated = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Payment params
  const planId = searchParams.get('planId');
  const phoneNumber = searchParams.get('phone') || '';
  const carrier = searchParams.get('carrier') as 'MTN' | 'ORANGE' | null;
  const amount = searchParams.get('amount');
  const referredBy = searchParams.get('referredBy');
  const cycle = searchParams.get('cycle') || 'monthly';

  // Handle transaction status update
  const handleTransactionUpdate = useCallback(async (transaction: { status: string; metadata?: { failure_reason?: string } | null }): Promise<boolean> => {
    if (isResolvedRef.current) return true;
    if (transaction.status !== 'completed' && transaction.status !== 'failed') return false;
    isResolvedRef.current = true;
    
    if (transaction.status === 'completed') {
      setStatus('completed');
      toast({
        title: t('payment_success'),
        description: t('payment_success_desc'),
      });
      return true;
    } else if (transaction.status === 'failed') {
      setStatus('failed');
      return true;
    }
    return false;
  }, [t, toast]);

  const isResolvedRef = useRef(false);
  usePaymentTracking(transactionId, user?.id, terminalStatus => {
    void handleTransactionUpdate({ status: terminalStatus });
  });

  const cleanupSubscription = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Start timeout when processing begins
  useEffect(() => {
    if (status === 'processing') {
      timeoutRef.current = setTimeout(() => {
        if (!isResolvedRef.current) {
          setStatus('timeout');
        }
      }, TIMEOUT_SECONDS * 1000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [status]);

  // Initiate payment
  const initiatePayment = useCallback(async () => {
    if (!planId || !phoneNumber || !amount || !user) {
      navigate('/subscriptions');
      return;
    }

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

    setStatus('processing');
    try {
      const { data, error } = await supabase.functions.invoke('mesomb-payment', {
        body: {
          planId,
          phoneNumber,
          amount: parseInt(amount),
          cycle,
          referredBy: referredBy || null
        }
      });

      if (error) throw error;
      if (data?.transactionId) {
        setTransactionId(data.transactionId);
        const persistedParams = new URLSearchParams(window.location.search);
        persistedParams.set('transactionId', data.transactionId);
        navigate(`/payment-processing?${persistedParams.toString()}`, { replace: true });
        
        if (data.status === 'completed' || data.testPayment) {
          await handleTransactionUpdate({ status: 'completed' });
        } else {
          setStatus('processing');

        }
      } else {
        setStatus('timeout');
      }
    } catch (error) {
      // A lost HTTP response does not prove that the operator did not debit.
      setStatus('timeout');
    }
  }, [planId, phoneNumber, amount, cycle, referredBy, user, navigate, handleTransactionUpdate, toast]);

  // Main effect
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    if (transactionId && !paymentInitiated.current) {
      setStatus('processing');

      paymentInitiated.current = true;
      return;
    }

    if (planId && phoneNumber && amount && !paymentInitiated.current) {
      paymentInitiated.current = true;
      initiatePayment();
      return;
    }

    if (!transactionId && !planId) {
      navigate('/subscriptions');
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // A confirmed debit can arrive before the subscription is readable.
  // Retry only subscription reads; never restart the payment.
  useEffect(() => {
    if (status !== 'completed') return;
    cleanupSubscription();
    let cancelled = false;
    setRefreshingAccess(true);
    void refreshPaymentAccess(refreshSubscription, () => cancelled).then(ready => {
      if (cancelled) return;
      setAccessReady(ready);
      setRefreshingAccess(false);
    });
    return () => { cancelled = true; };
  }, [status, refreshSubscription, cleanupSubscription, accessRefreshAttempt]);

  // Reload the destination once, after access is confirmed. Replacing the
  // payment URL also keeps back/refresh from re-initiating this payment.
  useEffect(() => {
    if (!accessReady) return;
    const redirect = setTimeout(() => window.location.replace('/exams2'), 1000);
    return () => clearTimeout(redirect);
  }, [accessReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSubscription();
    };
  }, [cleanupSubscription]);

  // Manual verification
  const handleVerify = async () => {
    if (!transactionId) return;
    setVerifying(true);

    // Ask the server to reconcile with MeSomb (covers a missed webhook)
    let resolvedStatus: string | null = null;
    try {
      const { data: checked } = await supabase.functions.invoke('check-payment-status', {
        body: { transactionId },
      });
      if (checked?.status) resolvedStatus = checked.status as string;
    } catch (e) {
      console.warn('Status reconciliation failed, falling back to database read', e);
    }

    if (!resolvedStatus) {
      const { data } = await supabase
        .from('transactions')
        .select('status')
        .eq('id', transactionId)
        .single();
      resolvedStatus = data?.status ?? null;
    }

    if (resolvedStatus === 'completed' || resolvedStatus === 'failed') {
      await handleTransactionUpdate({ status: resolvedStatus });
    } else {
      setStatus('processing');
      toast({
        title: 'Paiement en cours',
        description: "Le paiement n'est pas encore confirmé. Veuillez patienter.",
      });
    }
    setVerifying(false);
  };


  const handleRetry = () => {
    cleanupSubscription();
    const params = new URLSearchParams();
    if (planId) params.set('planId', planId);
    if (phoneNumber) params.set('phone', phoneNumber);
    params.set('cycle', cycle);
    if (referredBy) localStorage.setItem('referral_affiliate_id', referredBy);
    navigate(`/payment?${params.toString()}`);
  };

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
                <AlertTriangle className="h-10 w-10 text-amber-500" />
              )}
              {status === 'timeout' && (
                <AlertTriangle className="h-10 w-10 text-amber-500" />
              )}
            </div>
            
            <CardTitle className="text-2xl">
              {status === 'initiating' && 'Initialisation du paiement...'}
              {status === 'processing' && 'Confirmez sur votre téléphone'}
              {status === 'completed' && t('payment_success')}
              {status === 'failed' && 'Paiement non confirmé'}
              {status === 'timeout' && 'Avez-vous effectué le paiement ?'}
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
                <span>{accessReady
                  ? 'Votre accès est activé. Ouverture des examens…'
                  : refreshingAccess
                    ? 'Paiement confirmé. Actualisation de vos accès…'
                    : 'Paiement confirmé. Votre accès n’est pas encore disponible. Actualisez les accès sans repayer.'}</span>
              )}
              {status === 'failed' && (
                <span className="text-amber-600 dark:text-amber-400">
                  La confirmation du paiement n’est pas encore disponible.
                </span>
              )}
              {status === 'timeout' && (
                <span className="text-amber-600 dark:text-amber-400">
                  La confirmation du paiement n’est pas encore disponible.
                </span>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Phone number display */}
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
                  <div className="space-y-3">
                    {/* Payment instructions */}
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-left space-y-2">
                      <div className="flex items-start gap-2">
                        <MessageCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-foreground">
                          Vous allez recevoir une notification sur votre téléphone
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-foreground">
                          Composez <strong className="text-primary">{carrier === 'MTN' ? '*126#' : '#150*50#'}</strong> pour valider comme recommandé
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">
                        Veuillez patienter, la confirmation peut prendre quelques instants
                      </p>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      La page se mettra à jour automatiquement une fois le paiement confirmé
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Timeout state */}
            {status === 'timeout' && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {transactionId
                      ? 'Si vous avez déjà confirmé sur votre téléphone, cliquez sur « Vérifier ». Ne lancez pas un deuxième paiement.'
                      : 'La connexion a été interrompue avant réception de la référence. Vérifiez votre compte Mobile Money et votre historique YimaProf avant tout nouveau paiement.'}
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleVerify} 
                    disabled={verifying || !transactionId}
                    className="w-full" 
                    size="lg"
                  >
                    {verifying ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Oui, vérifier mon paiement
                  </Button>

                </div>
              </div>
            )}

            {/* Completed */}
            {status === 'completed' && (
              <Button
                onClick={() => accessReady ? window.location.replace('/exams2') : setAccessRefreshAttempt(previous => previous + 1)}
                disabled={refreshingAccess}
                className="w-full" size="lg"
              >
                {refreshingAccess && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {accessReady ? 'Accéder aux examens maintenant' : 'Actualiser mes accès'}
              </Button>
            )}

            {/* Failed - yellow warning style */}
            {status === 'failed' && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Le paiement n'a pas été confirmé. Vous pouvez réessayer.
                  </p>
                </div>
                <Button onClick={handleRetry} className="w-full" size="lg">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer le paiement
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
