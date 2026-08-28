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
import { Loader2, CheckCircle, Phone, AlertTriangle, RefreshCw, MessageCircle } from 'lucide-react';

const TIMEOUT_SECONDS = 90;

export default function PaymentProcessing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { refreshSubscription } = useSubscription();
  const [status, setStatus] = useState<'initiating' | 'processing' | 'completed' | 'failed' | 'timeout'>('initiating');
  const [countdown, setCountdown] = useState(5);
  const [transactionId, setTransactionId] = useState<string | null>(searchParams.get('transactionId'));
  const [verifying, setVerifying] = useState(false);
  
  const paymentInitiated = useRef(false);
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Payment params
  const planId = searchParams.get('planId');
  const phoneNumber = searchParams.get('phone') || '';
  const carrier = searchParams.get('carrier') as 'MTN' | 'ORANGE' | null;
  const amount = searchParams.get('amount');
  const referredBy = searchParams.get('referredBy');

  // Handle transaction status update
  const handleTransactionUpdate = useCallback(async (transaction: { status: string; metadata?: { failure_reason?: string } | null }): Promise<boolean> => {
    console.log('Processing transaction update:', transaction.status);
    
    if (transaction.status === 'completed') {
      setStatus('completed');
      await refreshSubscription();
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
  }, [t, toast, refreshSubscription]);

  // Polling fallback
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef(2000);
  const isResolvedRef = useRef(false);

  const subscribeToTransaction = useCallback((txId: string) => {
    console.log('Subscribing to transaction updates:', txId);
    isResolvedRef.current = false;
    pollIntervalRef.current = 2000;
    
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
          console.log('=== REALTIME WEBHOOK RESPONSE ===');
          if (!isResolvedRef.current) {
            const isTerminal = await handleTransactionUpdate(payload.new as { status: string; metadata?: { failure_reason?: string } | null });
            if (isTerminal) {
              isResolvedRef.current = true;
            }
          }
        }
      )
      .subscribe();

    // Polling fallback
    const poll = async () => {
      if (isResolvedRef.current) return;
      
      const { data, error } = await supabase
        .from('transactions')
        .select('status, metadata, updated_at, provider_reference')
        .eq('id', txId)
        .single();

      if (!error && data) {
        if (data.status === 'completed' || data.status === 'failed') {
          if (!isResolvedRef.current) {
            const isTerminal = await handleTransactionUpdate(data as { status: string; metadata?: { failure_reason?: string } | null });
            if (isTerminal) {
              isResolvedRef.current = true;
            }
          }
          return;
        }
      }

      pollIntervalRef.current = Math.min(pollIntervalRef.current * 1.5, 30000);
      pollTimeoutRef.current = setTimeout(poll, pollIntervalRef.current);
    };

    pollTimeoutRef.current = setTimeout(poll, pollIntervalRef.current);
  }, [handleTransactionUpdate]);

  const cleanupSubscription = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current);
      realtimeChannel.current = null;
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

    try {
      const { data, error } = await supabase.functions.invoke('mesomb-payment', {
        body: {
          planId,
          phoneNumber,
          amount: parseInt(amount),
          referredBy: referredBy || null
        }
      });

      if (data?.transactionId) {
        setTransactionId(data.transactionId);
        
        if (data.status === 'completed' || data.testPayment) {
          setStatus('completed');
          await refreshSubscription();
          toast({
            title: t('payment_success'),
            description: t('payment_success_desc'),
          });
        } else {
          setStatus('processing');
          subscribeToTransaction(data.transactionId);
        }
      } else {
        setStatus('failed');
      }
    } catch (error) {
      setStatus('failed');
    }
  }, [planId, phoneNumber, amount, referredBy, user, navigate, subscribeToTransaction, t, toast, refreshSubscription]);

  // Main effect
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (transactionId && !paymentInitiated.current) {
      setStatus('processing');
      subscribeToTransaction(transactionId);
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
  }, [user]);

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

    if (resolvedStatus === 'completed') {
      isResolvedRef.current = true;
      setStatus('completed');
      await refreshSubscription();
      toast({
        title: t('payment_success'),
        description: t('payment_success_desc'),
      });
    } else if (resolvedStatus === 'failed') {
      isResolvedRef.current = true;
      setStatus('failed');
    } else {
      // Still processing - go back to processing and restart timeout
      setStatus('processing');
      toast({
        title: 'Paiement en cours',
        description: 'Le paiement n\'est pas encore confirmé. Veuillez patienter.',
      });
    }
    setVerifying(false);
  };


  const handleRetry = () => {
    cleanupSubscription();
    const params = new URLSearchParams();
    if (planId) params.set('planId', planId);
    if (phoneNumber) params.set('phone', phoneNumber);
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
                <span>Redirection vers les examens dans {countdown} secondes...</span>
              )}
              {status === 'failed' && (
                <span className="text-amber-600 dark:text-amber-400">
                  Vous n'avez pas confirmé votre paiement à temps
                </span>
              )}
              {status === 'timeout' && (
                <span className="text-amber-600 dark:text-amber-400">
                  Vous n'avez pas confirmé votre paiement à temps
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
                          Composez <strong className="text-primary">#150*50#</strong> pour valider comme recommandé
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
                    Si vous avez déjà confirmé le paiement sur votre téléphone, cliquez sur "Vérifier" pour confirmer.
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleVerify} 
                    disabled={verifying}
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
                  <Button 
                    variant="outline" 
                    onClick={handleRetry}
                    className="w-full" 
                    size="lg"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réessayer le paiement
                  </Button>
                </div>
              </div>
            )}

            {/* Completed */}
            {status === 'completed' && (
              <Button onClick={() => navigate('/exams2')} className="w-full" size="lg">
                Accéder aux examens maintenant
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
