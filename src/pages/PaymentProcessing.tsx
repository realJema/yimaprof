import { useState, useEffect } from 'react';
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
  const [status, setStatus] = useState<'processing' | 'completed' | 'failed'>('processing');
  const [checkCount, setCheckCount] = useState(0);
  const maxChecks = 30; // Check for 5 minutes (30 checks * 10 seconds)

  const transactionId = searchParams.get('transactionId');
  const phoneNumber = searchParams.get('phone') || '';
  const carrier = searchParams.get('carrier') as 'MTN' | 'ORANGE' | null;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!transactionId) {
      navigate('/subscriptions');
      return;
    }

    // Start checking payment status
    checkPaymentStatus();
    
    // Set up interval to check status every 10 seconds
    const interval = setInterval(() => {
      setCheckCount(prev => {
        if (prev >= maxChecks) {
          clearInterval(interval);
          setStatus('failed');
          return prev;
        }
        checkPaymentStatus();
        return prev + 1;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [user, transactionId, navigate]);

  const checkPaymentStatus = async () => {
    if (!transactionId) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: { transactionId }
      });

      if (error) throw error;

      if (data.status === 'completed') {
        setStatus('completed');
        toast({
          title: t('payment_success'),
          description: t('payment_success_desc'),
        });
      } else if (data.status === 'failed') {
        setStatus('failed');
        toast({
          title: t('payment_failed'),
          description: t('payment_failed_desc'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

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
              {status === 'processing' && (
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
              {status === 'processing' && t('payment_processing')}
              {status === 'completed' && t('payment_success')}
              {status === 'failed' && t('payment_failed')}
            </CardTitle>
            
            <CardDescription>
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