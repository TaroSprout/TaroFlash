-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.update_feedback_item(p_feedback_id bigint, p_status public.feedback_status, p_visibility public.feedback_visibility) RETURNS public.feedback_items
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_item public.feedback_items;
BEGIN
  IF NOT public.can_moderate_feedback() THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;

  UPDATE public.feedback_items
  SET status = p_status, visibility = p_visibility
  WHERE id = p_feedback_id
  RETURNING * INTO v_item;

  IF v_item IS NULL THEN
    RAISE EXCEPTION 'Feedback item % not found', p_feedback_id;
  END IF;

  RETURN v_item;
END;
$$;


ALTER FUNCTION public.update_feedback_item(p_feedback_id bigint, p_status public.feedback_status, p_visibility public.feedback_visibility) OWNER TO postgres;


REVOKE ALL ON FUNCTION public.update_feedback_item(p_feedback_id bigint, p_status public.feedback_status, p_visibility public.feedback_visibility) FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_feedback_item(p_feedback_id bigint, p_status public.feedback_status, p_visibility public.feedback_visibility) TO authenticated;
GRANT ALL ON FUNCTION public.update_feedback_item(p_feedback_id bigint, p_status public.feedback_status, p_visibility public.feedback_visibility) TO service_role;

