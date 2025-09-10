import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Phone } from 'lucide-react';

export default function PaymentProcessing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
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
          title: 'Payment Successful!',
          description: 'Your subscription has been activated.',
        });
      } else if (data.status === 'failed') {
        setStatus('failed');
        toast({
          title: 'Payment Failed',
          description: 'Your payment could not be processed.',
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

  const handleContinue = () => {
    navigate('/subscriptions');
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
              {status === 'processing' && 'Processing Payment'}
              {status === 'completed' && 'Payment Successful!'}
              {status === 'failed' && 'Payment Failed'}
            </CardTitle>
            
            <CardDescription>
              {status === 'processing' && (
                <>
                  Please complete the payment on your mobile device.
                  <br />
                  Check #{checkCount + 1} of {maxChecks}
                </>
              )}
              {status === 'completed' && 'Your subscription has been activated successfully.'}
              {status === 'failed' && 'Your payment could not be processed. Please try again.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {status === 'processing' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  Check your phone for the payment prompt
                </div>
                <div className="bg-muted/50 p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2">What to do next:</p>
                  <ol className="text-left space-y-1 list-decimal list-inside">
                    <li>Check your phone for a payment notification</li>
                    <li>Enter your mobile money PIN when prompted</li>
                    <li>Confirm the payment amount</li>
                    <li>Wait for confirmation</li>
                  </ol>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/subscriptions')}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}

            {status === 'completed' && (
              <Button onClick={handleContinue} className="w-full" size="lg">
                Continue to Subscriptions
              </Button>
            )}

            {status === 'failed' && (
              <div className="space-y-3">
                <Button onClick={handleRetry} className="w-full" size="lg">
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/subscriptions')}
                  className="w-full"
                >
                  Back to Plans
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}