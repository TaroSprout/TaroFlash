-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.toggle_feedback_vote(p_feedback_id bigint) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.feedback_votes
    WHERE feedback_id = p_feedback_id AND member_id = v_uid
  ) THEN
    DELETE FROM public.feedback_votes
    WHERE feedback_id = p_feedback_id AND member_id = v_uid;
    RETURN false;
  END IF;

  INSERT INTO public.feedback_votes (feedback_id, member_id)
  VALUES (p_feedback_id, v_uid);
  RETURN true;
END;
$$;


ALTER FUNCTION public.toggle_feedback_vote(p_feedback_id bigint) OWNER TO postgres;


REVOKE ALL ON FUNCTION public.toggle_feedback_vote(p_feedback_id bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.toggle_feedback_vote(p_feedback_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.toggle_feedback_vote(p_feedback_id bigint) TO service_role;

