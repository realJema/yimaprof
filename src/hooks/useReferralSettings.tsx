import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReferralSettings {
  school_rate: number;
  affiliate_rate: number;
  school_min_payout: number;
  affiliate_min_payout: number;
  tax_rate: number;
  tax_applied: boolean;
}

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
  school_rate: 20, affiliate_rate: 10, school_min_payout: 500, affiliate_min_payout: 500, tax_rate: 0, tax_applied: false,
};

/** Commission rates, payout minimums and the TX tax rate (single admin-editable row). */
export function useReferralSettings() {
  const [settings, setSettings] = useState<ReferralSettings>(DEFAULT_REFERRAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const { data } = await supabase.from('referral_settings' as never).select('*').eq('id', 1).maybeSingle();
    if (data) setSettings({ ...DEFAULT_REFERRAL_SETTINGS, ...(data as Partial<ReferralSettings>) });
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { settings, loading, refresh: load };
}
