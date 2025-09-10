import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminDataTable } from './AdminDataTable';
import { Users2, X } from 'lucide-react';

interface ActiveSubscription {
  id: string;
  status: string;
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  user_id: string;
  plan_id: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    email: string;
    first_name: string;
    last_name: string;
  };
  subscription_plans?: {
    name: string;
    price: number;
    currency: string;
  };
}

export function ActiveSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          profiles (
            email,
            first_name,
            last_name
          ),
          subscription_plans (
            name,
            price,
            currency
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const processedSubscriptions = (data || []).map(subscription => ({
        ...subscription,
        profiles: subscription.profiles || { email: '', first_name: '', last_name: '' }
      }));
      setSubscriptions(processedSubscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch active subscriptions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscription: ActiveSubscription) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (error) throw error;

      setSubscriptions(prev => prev.filter(s => s.id !== subscription.id));
      toast({
        title: 'Success',
        description: 'Subscription canceled successfully',
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive',
      });
    }
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const columns = [
    {
      key: 'profiles.email',
      label: 'User',
      render: (value: string, subscription: ActiveSubscription) => (
        <div>
          <div className="font-medium">{subscription.profiles?.email}</div>
          <div className="text-sm text-muted-foreground">
            {subscription.profiles?.first_name} {subscription.profiles?.last_name}
          </div>
        </div>
      ),
    },
    {
      key: 'subscription_plans.name',
      label: 'Plan',
      render: (value: string, subscription: ActiveSubscription) => (
        <div>
          <div className="font-medium">{subscription.subscription_plans?.name}</div>
          <div className="text-sm text-muted-foreground">
            {subscription.subscription_plans?.price?.toLocaleString()} {subscription.subscription_plans?.currency}
          </div>
        </div>
      ),
    },
    {
      key: 'started_at',
      label: 'Started',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'expires_at',
      label: 'Expires',
      render: (value: string) => {
        const daysRemaining = getDaysRemaining(value);
        return (
          <div>
            <div>{new Date(value).toLocaleDateString()}</div>
            <Badge 
              variant={daysRemaining < 7 ? 'destructive' : daysRemaining < 30 ? 'secondary' : 'default'}
              className="text-xs"
            >
              {daysRemaining} days left
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'auto_renew',
      label: 'Auto Renew',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant="default">
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
  ];

  const actions = (subscription: ActiveSubscription) => (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => handleCancelSubscription(subscription)}
      className="flex items-center gap-2"
    >
      <X className="h-4 w-4" />
      Cancel
    </Button>
  );

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-card-foreground flex items-center gap-2">
          <Users2 className="h-5 w-5" />
          Active Subscriptions ({subscriptions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AdminDataTable
          data={subscriptions}
          columns={columns}
          searchKey="email"
          actions={actions}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
}