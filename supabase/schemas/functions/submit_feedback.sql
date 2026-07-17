-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.submit_feedback(p_title text, p_body text, p_type public.feedback_type) RETURNS public.feedback_items
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_item public.feedback_items;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  INSERT INTO public.feedback_items (title, body, type)
  VALUES (p_title, p_body, p_type)
  RETURNING * INTO v_item;

  RETURN v_item;
END;
$$;


ALTER FUNCTION public.submit_feedback(p_title text, p_body text, p_type public.feedback_type) OWNER TO postgres;


REVOKE ALL ON FUNCTION public.submit_feedback(p_title text, p_body text, p_type public.feedback_type) FROM PUBLIC;
GRANT ALL ON FUNCTION public.submit_feedback(p_title text, p_body text, p_type public.feedback_type) TO authenticated;
GRANT ALL ON FUNCTION public.submit_feedback(p_title text, p_body text, p_type public.feedback_type) TO service_role;

