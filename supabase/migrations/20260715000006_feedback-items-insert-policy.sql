-- feedback_items was missing an INSERT policy — submit_feedback runs as
-- invoker (plain plpgsql, not security definer), so every submission hit
-- RLS as a 403, for every caller including admins. Same class of bug as
-- 20260715000005's feedback_votes fix.

BEGIN;

CREATE POLICY "members can insert their own feedback item"
ON public.feedback_items
FOR INSERT
TO authenticated
WITH CHECK (member_id = auth.uid());

COMMIT;
