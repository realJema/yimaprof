import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Deadline, validDeadline } from '@/lib/studyGuide';

type Preferences = { weekly_goal: number; deadline_kind: string | null; deadline_label: string | null; deadline_date: string | null };
const defaults: Preferences = { weekly_goal: 3, deadline_kind: null, deadline_label: null, deadline_date: null };
export function useStudyPreferences(userId?: string) {
  const client = useQueryClient();
  const key = ['study-preferences', userId];
  const query = useQuery({ queryKey: key, enabled: !!userId, queryFn: async (): Promise<Preferences> => {
    if (!userId) return defaults;
    const { data, error } = await supabase.from('study_preferences').select('weekly_goal, deadline_kind, deadline_label, deadline_date').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (data) return data as unknown as Preferences;
    // Import only when no server row exists; a deleted deadline must not reappear.
    let legacy: Deadline | null = null;
    try { const value = JSON.parse(localStorage.getItem(`yima_deadline_${userId}`) || 'null'); if (validDeadline(value)) legacy = value; } catch { /* No usable legacy date. */ }
    if (!legacy) return defaults;
    const imported = { ...defaults, deadline_kind: legacy.kind, deadline_label: legacy.label || null, deadline_date: legacy.date };
    const { error: saveError } = await supabase.from('study_preferences').upsert({ user_id: userId, ...imported }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (saveError) throw saveError;
    const { data: saved, error: readError } = await supabase.from('study_preferences').select('weekly_goal, deadline_kind, deadline_label, deadline_date').eq('user_id', userId).single();
    if (readError) throw readError;
    return saved as unknown as Preferences;
  } });
  const mutation = useMutation({ mutationFn: async (patch: Partial<Preferences>) => {
    if (!userId) throw new Error('Sign in required');
    const next = { ...(query.data || defaults), ...patch };
    if (next.weekly_goal < 1 || next.weekly_goal > 21 || !Number.isInteger(next.weekly_goal)) throw new Error('Invalid goal');
    if (next.deadline_date && !validDeadline({ kind: next.deadline_kind, label: next.deadline_label, date: next.deadline_date })) throw new Error('Invalid deadline');
    const { data, error } = await supabase.from('study_preferences').upsert({ user_id: userId, ...next }).select('weekly_goal, deadline_kind, deadline_label, deadline_date').single();
    if (error) throw error;
    return data as unknown as Preferences;
  }, onSuccess: data => client.setQueryData(key, data) });
  const preferences = query.data || defaults;
  const deadline: Deadline | null = preferences.deadline_date && preferences.deadline_kind ? { kind: preferences.deadline_kind, label: preferences.deadline_label || '', date: preferences.deadline_date } : null;
  return { ...query, preferences, deadline, save: mutation.mutateAsync, saving: mutation.isPending };
}