-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.feedback_items_with_votes() RETURNS TABLE(id bigint, created_at timestamp with time zone, member_id uuid, member_display_name text, member_avatar text, title text, body text, type public.feedback_type, status public.feedback_status, visibility public.feedback_visibility, vote_count integer, voted_by_me boolean)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    f.id,
    f.created_at,
    f.member_id,
    m.display_name AS member_display_name,
    m.cover_config->>'avatar' AS member_avatar,
    f.title,
    f.body,
    f.type,
    f.status,
    f.visibility,
    (SELECT count(*)::int FROM public.feedback_votes v WHERE v.feedback_id = f.id) AS vote_count,
    EXISTS (
      SELECT 1 FROM public.feedback_votes v
      WHERE v.feedback_id = f.id AND v.member_id = auth.uid()
    ) AS voted_by_me
  FROM public.feedback_items f
  LEFT JOIN public.members m ON m.id = f.member_id
$$;


ALTER FUNCTION public.feedback_items_with_votes() OWNER TO postgres;


GRANT ALL ON FUNCTION public.feedback_items_with_votes() TO anon;
GRANT ALL ON FUNCTION public.feedback_items_with_votes() TO authenticated;
GRANT ALL ON FUNCTION public.feedback_items_with_votes() TO service_role;

