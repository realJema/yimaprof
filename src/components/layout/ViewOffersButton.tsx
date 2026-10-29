import { useQuery } from '@tanstack/react-query';
import { browseQueryOptions, browseReadSignal } from '@/lib/browseQuery';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';

/**
 * Sticky "See plans" button shown to visitors and non-subscribers on the
 * Exams and Lessons pages. Displays the cheapest active monthly price so the
 * cost is immediately readable and reassuring. Hidden for active subscribers.
 */
export default function ViewOffersButton() {
  const { hasActiveSubscription, loading } = useSubscription();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { data: minPrice } = useQuery({
    queryKey: ['browse-minimum-plan-price'],
    ...browseQueryOptions,
    enabled: !loading && !hasActiveSubscription,
    queryFn: async () => {
      const { data, error } = await supabase.from('subscription_plans').select('price')
        .eq('is_active', true).order('price', { ascending: true }).limit(1)
        .abortSignal(browseReadSignal());
      if (error) throw error;
      return data?.[0]?.price ?? null;
    },
  });

  if (loading || hasActiveSubscription) return null;

  const price = minPrice
    ? ` – ${fr ? 'À partir de' : 'From'} ${minPrice.toLocaleString('fr-FR')} FCFA/${fr ? 'mois' : 'month'}`
    : '';

  return (
    <div className="sticky top-20 z-20 flex justify-center pointer-events-none">
      <Button asChild className="gradient-primary shadow-medium pointer-events-auto">
        <Link to="/subscriptions">
          <Crown className="h-4 w-4 mr-2" />
          {fr ? 'Voir les offres' : 'See plans'}
          {price}
        </Link>
      </Button>
    </div>
  );
}
