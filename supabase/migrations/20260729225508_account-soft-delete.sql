drop policy "Enable delete for users based on user_id" on "public"."cards";

drop policy "Enable insert for authenticated users only" on "public"."cards";

drop policy "Read cards from public decks or own cards" on "public"."cards";

drop policy "Users can update their own cards" on "public"."cards";

drop policy "members can read and write their own decks' pacing" on "public"."deck_review_pacing";

drop policy "Enable delete for users based on user_id" on "public"."decks";

drop policy "Enable insert for authenticated users only" on "public"."decks";

drop policy "Enable update for authenticated users" on "public"."decks";

drop policy "Read public decks or own decks" on "public"."decks";

drop policy "members can insert their own feedback item" on "public"."feedback_items";

drop policy "members can read public feedback items" on "public"."feedback_items";

drop policy "members can delete their own feedback vote" on "public"."feedback_votes";

drop policy "members can insert their own feedback vote" on "public"."feedback_votes";

drop policy "lesson_collections_owner_delete" on "public"."lesson_collections";

drop policy "lesson_collections_owner_insert" on "public"."lesson_collections";

drop policy "lesson_collections_owner_select" on "public"."lesson_collections";

drop policy "lesson_collections_owner_update" on "public"."lesson_collections";

drop policy "lessons_owner_delete" on "public"."lessons";

drop policy "lessons_owner_insert" on "public"."lessons";

drop policy "lessons_owner_select" on "public"."lessons";

drop policy "lessons_owner_update" on "public"."lessons";

drop policy "Enable delete for users based on user_id" on "public"."media";

drop policy "Enable insert for authenticated users only" on "public"."media";

drop policy "Enable update for users with member_id" on "public"."media";

drop policy "Read own media or media in public decks" on "public"."media";

drop policy "members can update their own non-privileged fields" on "public"."members";

drop policy "Enable insert for users based on user_id" on "public"."purchases";

drop policy "Enable users to view their own data only" on "public"."purchases";

drop policy "members can update their own purchases" on "public"."purchases";

drop policy "Members can insert their own review logs" on "public"."review_logs";

drop policy "Members can view their own review logs" on "public"."review_logs";

drop policy "members can delete their own presets" on "public"."review_pacing_presets";

drop policy "members can insert their own presets" on "public"."review_pacing_presets";

drop policy "members can read their own or the system preset" on "public"."review_pacing_presets";

drop policy "members can update their own presets" on "public"."review_pacing_presets";

drop policy "Enable insert for users based on user_id" on "public"."reviews";

drop policy "Enable users to view their own data only" on "public"."reviews";

drop policy "members can update their own reviews" on "public"."reviews";

alter table "public"."decks" add column "unpublished_by_deletion" boolean not null default false;

alter table "public"."members" add column "delete_at" timestamp with time zone;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.active_member_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id from public.members
  where id = auth.uid()
    and delete_at is null
$function$
;

CREATE OR REPLACE FUNCTION public.begin_account_deletion(p_member_id uuid)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  -- The grace period lives here, in the only writer of delete_at. Confirm the
  -- length with counsel before launch; GDPR wants erasure "without undue delay".
  v_grace   interval := interval '30 days';
  v_deadline timestamptz;
BEGIN
  SELECT m.delete_at INTO v_deadline
  FROM public.members m
  WHERE m.id = p_member_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No member %', p_member_id USING errcode = 'no_data_found';
  END IF;

  IF v_deadline IS NOT NULL THEN
    RETURN v_deadline;
  END IF;

  v_deadline := now() + v_grace;

  UPDATE public.members
  SET delete_at = v_deadline
  WHERE id = p_member_id;

  -- Hide the account from everyone else without taxing any read path. Flipping
  -- their public decks private here is one write over one member's rows; the
  -- alternative — teaching the public-read policies to check whether each deck's
  -- owner is pending — would add a per-row members lookup to every public deck
  -- and card read in the app, forever. The flag records which decks to put back.
  UPDATE public.decks
  SET is_public = false,
      unpublished_by_deletion = true
  WHERE member_id = p_member_id
    AND is_public;

  RETURN v_deadline;
END;
$function$
;

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
    RAISE EXCEPTION 'Account is not pending deletion' USING errcode = 'invalid_parameter_value';
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

CREATE OR REPLACE FUNCTION public.member_public_profile(p_member_id uuid)
 RETURNS SETOF public.member_profile
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.display_name, m.description, m.cover_config
  FROM public.members m
  WHERE m.id = p_member_id
    -- A pending-deletion member is hidden from everyone else: returning no rows
    -- makes callers fall back to their anonymous-author display. Free to check
    -- here — this function is already reading the row the flag lives on, so it
    -- costs no extra lookup, unlike filtering by owner in a hot read policy.
    AND m.delete_at IS NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.reset_deck_reviews(p_deck_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  -- active_member_id(), not auth.uid() — SECURITY DEFINER bypasses RLS, so this
  -- ownership check is the only thing standing between a suspended account and
  -- its data. See save_review.sql for the longer note.
  v_uid uuid := public.active_member_id();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.decks
    WHERE public.decks.id = p_deck_id AND public.decks.member_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Deck not found or not owned by user';
  END IF;

  DELETE FROM public.review_logs
   WHERE card_id IN (SELECT id FROM public.cards WHERE deck_id = p_deck_id);

  DELETE FROM public.reviews
   WHERE card_id IN (SELECT id FROM public.cards WHERE deck_id = p_deck_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_review(p_card_id bigint, p_due timestamp with time zone, p_stability real, p_difficulty real, p_elapsed_days smallint, p_scheduled_days smallint, p_reps smallint, p_lapses smallint, p_last_review timestamp with time zone, p_card_state smallint, p_rating smallint, p_state smallint, p_log_due timestamp with time zone, p_log_stability real, p_log_difficulty real, p_log_scheduled_days smallint, p_review timestamp with time zone, p_learning_steps smallint DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  -- active_member_id(), not auth.uid(). SECURITY DEFINER means RLS never runs
  -- here, so the policy sweep that suspends a pending-deletion account does not
  -- reach this function — it would happily keep writing reviews for an account
  -- whose data is supposed to be frozen. The ownership check below is the only
  -- gate there is, so it has to be the one that knows about suspension.
  v_uid uuid := public.active_member_id();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the card belongs to this user before writing anything
  IF NOT EXISTS (
    SELECT 1 FROM public.cards
    WHERE id = p_card_id AND member_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Card not found or not owned by user';
  END IF;

  -- Update current FSRS state (upsert so new cards get their first review row)
  INSERT INTO public.reviews (
    card_id, member_id,
    due, stability, difficulty, elapsed_days,
    scheduled_days, reps, lapses, last_review, state, learning_steps
  )
  VALUES (
    p_card_id, v_uid,
    p_due, p_stability, p_difficulty, p_elapsed_days,
    p_scheduled_days, p_reps, p_lapses, p_last_review, p_card_state, p_learning_steps
  )
  ON CONFLICT (card_id) DO UPDATE SET
    due            = EXCLUDED.due,
    stability      = EXCLUDED.stability,
    difficulty     = EXCLUDED.difficulty,
    elapsed_days   = EXCLUDED.elapsed_days,
    scheduled_days = EXCLUDED.scheduled_days,
    reps           = EXCLUDED.reps,
    lapses         = EXCLUDED.lapses,
    last_review    = EXCLUDED.last_review,
    state          = EXCLUDED.state,
    learning_steps = EXCLUDED.learning_steps;

  -- Append the review event to history
  INSERT INTO public.review_logs (
    card_id, member_id,
    rating, state, due,
    stability, difficulty,
    scheduled_days,
    review
  )
  VALUES (
    p_card_id, v_uid,
    p_rating, p_state, p_log_due,
    p_log_stability, p_log_difficulty,
    p_log_scheduled_days,
    p_review
  );
END;
$function$
;


  create policy "Enable delete for users based on user_id"
  on "public"."cards"
  as permissive
  for delete
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "Enable insert for authenticated users only"
  on "public"."cards"
  as permissive
  for insert
  to authenticated
with check ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "Read cards from public decks or own cards"
  on "public"."cards"
  as permissive
  for select
  to public
using (((( SELECT public.active_member_id() AS active_member_id) = member_id) OR (EXISTS ( SELECT 1
   FROM public.decks
  WHERE ((decks.id = cards.deck_id) AND (decks.is_public = true))))));



  create policy "Users can update their own cards"
  on "public"."cards"
  as permissive
  for update
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id))
with check ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "members can read and write their own decks' pacing"
  on "public"."deck_review_pacing"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.decks d
  WHERE ((d.id = deck_review_pacing.deck_id) AND (d.member_id = ( SELECT public.active_member_id() AS active_member_id))))))
with check ((EXISTS ( SELECT 1
   FROM public.decks d
  WHERE ((d.id = deck_review_pacing.deck_id) AND (d.member_id = ( SELECT public.active_member_id() AS active_member_id))))));



  create policy "Enable delete for users based on user_id"
  on "public"."decks"
  as permissive
  for delete
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "Enable insert for authenticated users only"
  on "public"."decks"
  as permissive
  for insert
  to authenticated
with check ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "Enable update for authenticated users"
  on "public"."decks"
  as permissive
  for update
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "Read public decks or own decks"
  on "public"."decks"
  as permissive
  for select
  to public
using (((is_public = true) OR (( SELECT public.active_member_id() AS active_member_id) = member_id)));



  create policy "members can insert their own feedback item"
  on "public"."feedback_items"
  as permissive
  for insert
  to authenticated
with check ((member_id = ( SELECT public.active_member_id() AS active_member_id)));



  create policy "members can read public feedback items"
  on "public"."feedback_items"
  as permissive
  for select
  to authenticated
using (((visibility = 'public'::public.feedback_visibility) OR public.can_moderate_feedback() OR (member_id = ( SELECT public.active_member_id() AS active_member_id))));



  create policy "members can delete their own feedback vote"
  on "public"."feedback_votes"
  as permissive
  for delete
  to authenticated
using ((member_id = ( SELECT public.active_member_id() AS active_member_id)));



  create policy "members can insert their own feedback vote"
  on "public"."feedback_votes"
  as permissive
  for insert
  to authenticated
with check ((member_id = ( SELECT public.active_member_id() AS active_member_id)));



  create policy "lesson_collections_owner_delete"
  on "public"."lesson_collections"
  as permissive
  for delete
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "lesson_collections_owner_insert"
  on "public"."lesson_collections"
  as permissive
  for insert
  to authenticated
with check ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "lesson_collections_owner_select"
  on "public"."lesson_collections"
  as permissive
  for select
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "lesson_collections_owner_update"
  on "public"."lesson_collections"
  as permissive
  for update
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id))
with check ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "lessons_owner_delete"
  on "public"."lessons"
  as permissive
  for delete
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "lessons_owner_insert"
  on "public"."lessons"
  as permissive
  for insert
  to authenticated
with check ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "lessons_owner_select"
  on "public"."lessons"
  as permissive
  for select
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "lessons_owner_update"
  on "public"."lessons"
  as permissive
  for update
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id))
with check ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "Enable delete for users based on user_id"
  on "public"."media"
  as permissive
  for delete
  to public
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "Enable insert for authenticated users only"
  on "public"."media"
  as permissive
  for insert
  to authenticated
with check (((( SELECT public.active_member_id() AS active_member_id) = member_id) AND ((NOT COALESCE((slot = ANY (ARRAY['card_front'::public.media_slot, 'card_back'::public.media_slot])), false)) OR (public.auth_plan() = 'paid'::text))));



  create policy "Enable update for users with member_id"
  on "public"."media"
  as permissive
  for update
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "Read own media or media in public decks"
  on "public"."media"
  as permissive
  for select
  to public
using (((( SELECT public.active_member_id() AS active_member_id) = member_id) OR (EXISTS ( SELECT 1
   FROM (public.cards c
     JOIN public.decks d ON ((d.id = c.deck_id)))
  WHERE ((c.id = media.card_id) AND (d.is_public = true)))) OR (EXISTS ( SELECT 1
   FROM public.decks d
  WHERE ((d.id = media.deck_id) AND (d.is_public = true))))));



  create policy "members can update their own non-privileged fields"
  on "public"."members"
  as permissive
  for update
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = id))
with check (((( SELECT public.active_member_id() AS active_member_id) = id) AND (role = ( SELECT members_1.role
   FROM public.members members_1
  WHERE (members_1.id = auth.uid()))) AND (plan = ( SELECT members_1.plan
   FROM public.members members_1
  WHERE (members_1.id = auth.uid()))) AND (NOT (stripe_customer_id IS DISTINCT FROM ( SELECT members_1.stripe_customer_id
   FROM public.members members_1
  WHERE (members_1.id = auth.uid())))) AND (NOT (stripe_subscription_id IS DISTINCT FROM ( SELECT members_1.stripe_subscription_id
   FROM public.members members_1
  WHERE (members_1.id = auth.uid())))) AND (NOT (delete_at IS DISTINCT FROM ( SELECT members_1.delete_at
   FROM public.members members_1
  WHERE (members_1.id = auth.uid()))))));



  create policy "Enable insert for users based on user_id"
  on "public"."purchases"
  as permissive
  for insert
  to authenticated
with check ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "Enable users to view their own data only"
  on "public"."purchases"
  as permissive
  for select
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "members can update their own purchases"
  on "public"."purchases"
  as permissive
  for update
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "Members can insert their own review logs"
  on "public"."review_logs"
  as permissive
  for insert
  to authenticated
with check ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "Members can view their own review logs"
  on "public"."review_logs"
  as permissive
  for select
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "members can delete their own presets"
  on "public"."review_pacing_presets"
  as permissive
  for delete
  to authenticated
using (((member_id = ( SELECT public.active_member_id() AS active_member_id)) AND (is_system = false)));



  create policy "members can insert their own presets"
  on "public"."review_pacing_presets"
  as permissive
  for insert
  to authenticated
with check (((member_id = ( SELECT public.active_member_id() AS active_member_id)) AND (is_system = false)));



  create policy "members can read their own or the system preset"
  on "public"."review_pacing_presets"
  as permissive
  for select
  to authenticated
using ((is_system OR (member_id = ( SELECT public.active_member_id() AS active_member_id))));



  create policy "members can update their own presets"
  on "public"."review_pacing_presets"
  as permissive
  for update
  to authenticated
using (((member_id = ( SELECT public.active_member_id() AS active_member_id)) AND (is_system = false)))
with check (((member_id = ( SELECT public.active_member_id() AS active_member_id)) AND (is_system = false)));



  create policy "Enable insert for users based on user_id"
  on "public"."reviews"
  as permissive
  for insert
  to authenticated
with check (( SELECT (( SELECT public.active_member_id() AS active_member_id) = reviews.member_id)));



  create policy "Enable users to view their own data only"
  on "public"."reviews"
  as permissive
  for select
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));



  create policy "members can update their own reviews"
  on "public"."reviews"
  as permissive
  for update
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));


drop policy "audio_lessons_authenticated_delete" on "storage"."objects";

drop policy "audio_lessons_authenticated_insert" on "storage"."objects";

drop policy "audio_lessons_authenticated_select" on "storage"."objects";

drop policy "audio_lessons_authenticated_update" on "storage"."objects";

drop policy "member_images_authenticated_delete" on "storage"."objects";

drop policy "member_images_authenticated_insert" on "storage"."objects";

drop policy "member_images_authenticated_select" on "storage"."objects";

drop policy "member_images_authenticated_update" on "storage"."objects";


  create policy "audio_lessons_authenticated_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'audio-lessons'::text) AND ((( SELECT public.active_member_id() AS active_member_id))::text = (storage.foldername(name))[1])));



  create policy "audio_lessons_authenticated_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'audio-lessons'::text) AND ((( SELECT public.active_member_id() AS active_member_id))::text = (storage.foldername(name))[1])));



  create policy "audio_lessons_authenticated_select"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'audio-lessons'::text) AND ((( SELECT public.active_member_id() AS active_member_id))::text = (storage.foldername(name))[1])));



  create policy "audio_lessons_authenticated_update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'audio-lessons'::text) AND ((( SELECT public.active_member_id() AS active_member_id))::text = (storage.foldername(name))[1])))
with check (((bucket_id = 'audio-lessons'::text) AND ((( SELECT public.active_member_id() AS active_member_id))::text = (storage.foldername(name))[1])));



  create policy "member_images_authenticated_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'member-images'::text) AND ((( SELECT public.active_member_id() AS active_member_id))::text = (storage.foldername(name))[1])));



  create policy "member_images_authenticated_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'member-images'::text) AND ((( SELECT public.active_member_id() AS active_member_id))::text = (storage.foldername(name))[1])));



  create policy "member_images_authenticated_select"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'member-images'::text) AND ((( SELECT public.active_member_id() AS active_member_id))::text = (storage.foldername(name))[1])));



  create policy "member_images_authenticated_update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'member-images'::text) AND ((( SELECT public.active_member_id() AS active_member_id))::text = (storage.foldername(name))[1])))
with check (((bucket_id = 'member-images'::text) AND ((( SELECT public.active_member_id() AS active_member_id))::text = (storage.foldername(name))[1])));



