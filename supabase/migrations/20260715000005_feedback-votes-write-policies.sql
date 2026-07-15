-- feedback_votes was missing INSERT/DELETE RLS policies — toggle_feedback_vote
-- runs as invoker (plain plpgsql, not security definer), so writes need an
-- explicit member-scoped policy, not just the existing SELECT one.

BEGIN;

CREATE POLICY "members can insert their own feedback vote"
ON public.feedback_votes
FOR INSERT
TO authenticated
WITH CHECK (member_id = auth.uid());

CREATE POLICY "members can delete their own feedback vote"
ON public.feedback_votes
FOR DELETE
TO authenticated
USING (member_id = auth.uid());

COMMIT;
