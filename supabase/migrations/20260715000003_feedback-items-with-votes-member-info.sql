-- feedback_items_with_votes: surface the submitter's display name + avatar
-- for the feedback board card. RETURNS TABLE column add = signature change,
-- so DROP + CREATE (same rule as decks_with_stats).

BEGIN;

DROP FUNCTION public.feedback_items_with_votes();

CREATE FUNCTION public.feedback_items_with_votes()
RETURNS TABLE (
  id                  bigint,
  created_at          timestamptz,
  member_id           uuid,
  member_display_name text,
  member_avatar       text,
  title               text,
  body                text,
  type                feedback_type,
  status              feedback_status,
  visibility          feedback_visibility,
  vote_count          int,
  voted_by_me         boolean
)
LANGUAGE sql
SECURITY INVOKER
STABLE
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

GRANT EXECUTE ON FUNCTION public.feedback_items_with_votes() TO authenticated;

COMMIT;
