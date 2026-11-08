import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';

type Result = { rank: number; display_name: string; score_scaled: number | null; graded_out_of: number; time_spent_seconds: number };
export default function ChallengeResults({ challengeId }: { challengeId: string }) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [rows, setRows] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = async () => {
    setLoading(true); setError(false);
    const { data, error: failure } = await supabase.rpc('ended_challenge_leaderboard', { p_challenge_id: challengeId });
    setError(!!failure); setRows((data || []) as Result[]); setLoading(false);
  };
  useEffect(() => { void load(); }, [challengeId]);
  return <section id="results" className="mb-6 scroll-mt-24 border-y border-border py-6">
    <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Trophy className="h-5 w-5 text-secondary" />{fr ? 'Classement des meilleurs' : 'Top participants'}</h2>
    {loading ? <Skeleton className="h-24 w-full" /> : error ? <div><p>{fr ? 'Le classement n’a pas pu être chargé.' : 'Unable to load the leaderboard.'}</p><Button variant="outline" onClick={load}>{fr ? 'Réessayer' : 'Retry'}</Button></div> : !rows.length ? <p className="text-muted-foreground">{fr ? 'Aucun résultat soumis pour ce challenge.' : 'No submitted results for this challenge.'}</p> :
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left"><th className="p-2">{fr ? 'Rang' : 'Rank'}</th><th className="p-2">{fr ? 'Participant' : 'Participant'}</th><th className="p-2">{fr ? 'Note' : 'Score'}</th><th className="p-2">{fr ? 'Temps' : 'Time'}</th></tr></thead><tbody>{rows.map(row => <tr key={row.rank} className="border-b border-border"><td className="p-2 font-bold">{row.rank}</td><td className="p-2 break-words">{row.display_name}</td><td className="p-2">{row.score_scaled == null ? '—' : Number(row.score_scaled).toFixed(2)} / {row.graded_out_of}</td><td className="p-2">{Math.floor(row.time_spent_seconds / 60)}:{String(row.time_spent_seconds % 60).padStart(2, '0')}</td></tr>)}</tbody></table></div>}
  </section>;
}