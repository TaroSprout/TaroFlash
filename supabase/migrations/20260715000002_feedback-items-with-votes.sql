-- feedback_items_with_votes: surfaces vote_count and whether the calling
-- member has voted, for the board list view. SECURITY INVOKER so the
-- existing feedback_items RLS policy still gates which rows are visible.

BEGIN;

CREATE FUNCTION public.feedback_items_with_votes()
RETURNS TABLE (
  id           bigint,
  created_at   timestamptz,
  member_id    uuid,
  title        text,
  body         text,
  type         feedback_type,
  status       feedback_status,
  visibility   feedback_visibility,
  vote_count   int,
  voted_by_me  boolean
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT
    f.id,
    f.created_at,
    f.member_id,
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
$$;

GRANT EXECUTE ON FUNCTION public.feedback_items_with_votes() TO authenticated;

COMMIT;
