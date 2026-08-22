import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Establishment {
  id: string;
  name: string;
  type: string | null;
  city: string | null;
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  referral_code: string | null;
  logo_url: string | null;
  owner_id: string | null;
  approval_status: string;
  rejection_reason: string | null;
}

export function useEstablishment() {
  const { user, loading: authLoading } = useAuth();
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [isSchoolAdmin, setIsSchoolAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setEstablishment(null);
      setIsSchoolAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: roles }, { data: owned }, { data: profile }] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', user.id),
      supabase
        .from('establishments')
        .select('id, name, type, city, country, contact_email, contact_phone, referral_code, logo_url, owner_id, approval_status, rejection_reason')
        .eq('owner_id', user.id)
        .maybeSingle(),
      supabase.from('profiles').select('establishment_id').eq('id', user.id).maybeSingle(),
    ]);

    const roleList = (roles || []).map((r) => r.role as string);
    const admin = roleList.includes('admin') || roleList.includes('school_admin');

    let est = (owned as Establishment | null) ?? null;
    if (!est && profile?.establishment_id) {
      const { data } = await supabase
        .from('establishments')
        .select('id, name, type, city, country, contact_email, contact_phone, referral_code, logo_url, owner_id, approval_status, rejection_reason')
        .eq('id', profile.establishment_id)
        .maybeSingle();
      est = (data as Establishment | null) ?? null;
    }

    setEstablishment(est);
    setIsSchoolAdmin(admin && !!est);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  const isApproved = establishment?.approval_status === 'approved';

  return {
    establishment,
    isSchoolAdmin,
    isApproved,
    isPending: !!establishment && establishment.approval_status === 'pending',
    isRejected: !!establishment && establishment.approval_status === 'rejected',
    loading: loading || authLoading,
    refresh: load,
  };
}