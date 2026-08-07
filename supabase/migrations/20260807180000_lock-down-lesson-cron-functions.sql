-- =============================================================================
-- Lock down the lesson pipeline's cron/trigger entry points
-- =============================================================================
--
-- Both are SECURITY DEFINER and neither checks the caller, because neither was
-- ever meant to be called by one — they run from pg_cron and from a trigger,
-- both of which execute as postgres and are unaffected by these revokes.
--
--   reap_stalled_lessons()          marks every lesson stuck in `processing`
--                                   as failed. Reachable by anon, it's a
--                                   one-request kill switch for every
--                                   in-flight transcription on the platform.
--   invoke_lesson_process(bigint)   reads `service_role_key` out of vault and
--                                   calls an edge function with it. Reachable
--                                   by anon, it hands an unauthenticated
--                                   caller a service-role-authenticated
--                                   request against arbitrary lesson ids.
--
-- Same treatment invoke_cleanup_media() and the downgrade-grace functions
-- already got (20260411000011, 20260801230820); these two were missed because
-- `supabase db diff` never emits function grants, so a new definer function
-- silently inherits EXECUTE for PUBLIC. Guarded from here on by pgTAP
-- 00043_definer_function_anon_grants.
-- =============================================================================

REVOKE ALL ON FUNCTION public.reap_stalled_lessons() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reap_stalled_lessons() FROM anon;
REVOKE ALL ON FUNCTION public.reap_stalled_lessons() FROM authenticated;
REVOKE ALL ON FUNCTION public.reap_stalled_lessons() FROM service_role;

REVOKE ALL ON FUNCTION public.invoke_lesson_process(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invoke_lesson_process(bigint) FROM anon;
REVOKE ALL ON FUNCTION public.invoke_lesson_process(bigint) FROM authenticated;
REVOKE ALL ON FUNCTION public.invoke_lesson_process(bigint) FROM service_role;
