import { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration_days: number;
  features: string[];
  max_downloads: number;
  is_active: boolean;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string;
  subscription_plans: SubscriptionPlan;
}

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  hasActiveSubscription: boolean;
  subscriptionTier: string | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        setSubscription(null);
      } else if (data) {
        const processedData = {
          ...data,
          subscription_plans: {
            ...data.subscription_plans,
            features: Array.isArray(data.subscription_plans.features) 
              ? data.subscription_plans.features 
              : JSON.parse(data.subscription_plans.features as string)
          }
        };
        setSubscription(processedData);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSubscription();
  }, [user?.id]);

  const hasActiveSubscription = subscription !== null;
  const subscriptionTier = subscription?.subscription_plans?.name || null;

  const value = {
    subscription,
    loading,
    refreshSubscription,
    hasActiveSubscription,
    subscriptionTier,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}