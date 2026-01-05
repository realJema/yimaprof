import { useState, useEffect, createContext, useContext, useMemo } from 'react';
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
  daysRemaining: number | null;
  isExpiringSoon: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

/**
 * Check if a subscription is currently valid (not expired)
 * Uses UTC comparison to avoid timezone issues
 */
const isSubscriptionValid = (expiresAt: string | null | undefined): boolean => {
  if (!expiresAt) return false;
  
  try {
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    
    // Compare timestamps (both converted to UTC milliseconds)
    return expirationDate.getTime() > now.getTime();
  } catch (error) {
    console.error('Error parsing expiration date:', error);
    return false;
  }
};

/**
 * Calculate days remaining until expiration
 */
const calculateDaysRemaining = (expiresAt: string | null | undefined): number | null => {
  if (!expiresAt) return null;
  
  try {
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    const diffMs = expirationDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return 0;
    
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Error calculating days remaining:', error);
    return null;
  }
};

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
      // Fetch subscription with status 'active' AND expires_at in the future
      // Using gte (greater than or equal) with current timestamp
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('expires_at', now)
        .order('expires_at', { ascending: false })
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        setSubscription(null);
      } else if (data && data.subscription_plans) {
        // Double-check expiration on client side (defense in depth)
        if (isSubscriptionValid(data.expires_at)) {
          const processedData = {
            ...data,
            subscription_plans: {
              ...data.subscription_plans,
              features: Array.isArray(data.subscription_plans.features) 
                ? data.subscription_plans.features 
                : JSON.parse(data.subscription_plans.features as string || '[]')
            }
          };
          setSubscription(processedData);
        } else {
          // Subscription exists but is expired
          console.log('Subscription found but expired, treating as no subscription');
          setSubscription(null);
        }
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

  // Recalculate validity on each render to handle edge case of expiration during session
  const hasActiveSubscription = useMemo(() => {
    if (!subscription) return false;
    return isSubscriptionValid(subscription.expires_at);
  }, [subscription]);

  const subscriptionTier = hasActiveSubscription ? (subscription?.subscription_plans?.name || null) : null;
  
  const daysRemaining = useMemo(() => {
    if (!subscription || !hasActiveSubscription) return null;
    return calculateDaysRemaining(subscription.expires_at);
  }, [subscription, hasActiveSubscription]);
  
  // Consider "expiring soon" if 7 days or less remaining
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7;

  const value = {
    subscription,
    loading,
    refreshSubscription,
    hasActiveSubscription,
    subscriptionTier,
    daysRemaining,
    isExpiringSoon,
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