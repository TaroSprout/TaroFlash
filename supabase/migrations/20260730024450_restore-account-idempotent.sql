set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.restore_account()
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id uuid := auth.uid();
  v_deadline  timestamptz;
BEGIN
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = 'insufficient_privilege';
  END IF;

  SELECT m.delete_at INTO v_deadline
  FROM public.members m
  WHERE m.id = v_member_id
  FOR UPDATE;

  IF v_deadline IS NULL THEN
    RETURN NULL;
  END IF;

  -- Past the deadline the purge job may already be mid-sweep; refusing here
  -- avoids racing it and resurrecting an account whose data is being erased.
  IF v_deadline <= now() THEN
    RAISE EXCEPTION 'Grace period expired' USING errcode = 'invalid_parameter_value';
  END IF;

  UPDATE public.members
  SET delete_at = NULL
  WHERE id = v_member_id;

  UPDATE public.decks
  SET is_public = true,
      unpublished_by_deletion = false
  WHERE member_id = v_member_id
    AND unpublished_by_deletion;

  RETURN v_deadline;
END;
$function$
;


