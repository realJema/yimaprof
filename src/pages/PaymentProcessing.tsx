import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, CheckCircle, XCircle, Phone } from 'lucide-react';

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
                  {t('check')} #{checkCount + 1} {t('of')} {maxChecks}
                </>
              )}
              {status === 'completed' && t('payment_success_desc')}
              {status === 'failed' && t('payment_failed_desc')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {status === 'processing' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {t('check_phone_payment')}
                </div>
                <div className="bg-muted/50 p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2">{t('what_to_do_next')}</p>
                  <ol className="text-left space-y-1 list-decimal list-inside">
                    <li>{t('check_phone_notification')}</li>
                    <li>{t('enter_pin')}</li>
                    <li>{t('confirm_amount')}</li>
                    <li>{t('wait_confirmation')}</li>
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