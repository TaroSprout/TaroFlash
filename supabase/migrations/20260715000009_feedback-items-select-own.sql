-- submit_feedback's `RETURNING * INTO v_item` implicitly re-checks the SELECT
-- policy on the newly-inserted row. 20260715000008 changed the visibility
-- default to 'internal', so every non-moderator submission started failing
-- with "new row violates row-level security policy" — the insert succeeded
-- but RETURNING couldn't read it back. Members can now always read their own
-- feedback items regardless of visibility, matching their ability to submit them.

BEGIN;

ALTER POLICY "members can read public feedback items"
ON public.feedback_items
USING (visibility = 'public' OR can_moderate_feedback() OR member_id = auth.uid());

COMMIT;
