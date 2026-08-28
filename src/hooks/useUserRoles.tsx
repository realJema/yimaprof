import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/** Loads every role of the signed-in user once, so pages don't repeat role queries. */
export function useUserRoles() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    setRoles((data || []).map((r) => r.role as string));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  return {
    roles,
    isAdmin: roles.includes('admin'),
    isCommercial: roles.includes('commercial'),
    isParent: roles.includes('parent'),
    isSchoolAdmin: roles.includes('school_admin'),
    loading: loading || authLoading,
    refresh: load,
  };
}
