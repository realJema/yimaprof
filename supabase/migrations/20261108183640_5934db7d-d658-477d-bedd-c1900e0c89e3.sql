CREATE SCHEMA IF NOT EXISTS challenge_internal;
REVOKE ALL ON SCHEMA challenge_internal FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA challenge_internal TO authenticated,service_role;
ALTER FUNCTION public.ended_challenge_leaderboard(uuid) SET SCHEMA challenge_internal;
CREATE FUNCTION public.ended_challenge_leaderboard(p_challenge_id uuid) RETURNS TABLE(rank bigint,display_name text,score_scaled numeric,graded_out_of integer,time_spent_seconds integer) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT * FROM challenge_internal.ended_challenge_leaderboard(p_challenge_id); $$;
REVOKE ALL ON FUNCTION public.ended_challenge_leaderboard(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ended_challenge_leaderboard(uuid) TO authenticated,service_role;