-- knowledge: study_sessions, review_logs, save_review — unrecorded

drop function if exists "public"."save_review"(p_card_id bigint, p_card public.review_card_state, p_log public.review_log_entry);


  create table "public"."study_sessions" (
    "id" uuid not null,
    "member_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "closed_at" timestamp with time zone
      );


alter table "public"."study_sessions" enable row level security;

alter table "public"."review_logs" add column "session_id" uuid;

CREATE INDEX review_logs_session_id_idx ON public.review_logs USING btree (session_id);

CREATE INDEX study_sessions_member_id_idx ON public.study_sessions USING btree (member_id);

CREATE UNIQUE INDEX study_sessions_pkey ON public.study_sessions USING btree (id);

alter table "public"."study_sessions" add constraint "study_sessions_pkey" PRIMARY KEY using index "study_sessions_pkey";

alter table "public"."review_logs" add constraint "review_logs_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.study_sessions(id) ON DELETE SET NULL not valid;

alter table "public"."review_logs" validate constraint "review_logs_session_id_fkey";

alter table "public"."study_sessions" add constraint "study_sessions_member_id_fkey" FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE not valid;

alter table "public"."study_sessions" validate constraint "study_sessions_member_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.save_review(p_card_id bigint, p_card public.review_card_state, p_log public.review_log_entry, p_session_id uuid DEFAULT NULL::uuid)
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
    (p_card).due, (p_card).stability, (p_card).difficulty, (p_card).elapsed_days,
    (p_card).scheduled_days, (p_card).reps, (p_card).lapses, (p_card).last_review, (p_card).state,
    COALESCE((p_card).learning_steps, 0)
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

  -- This is the only place a study_sessions row gets created — don't add a
  -- separate "start session" RPC.
  IF p_session_id IS NOT NULL THEN
    INSERT INTO public.study_sessions (id, member_id)
    VALUES (p_session_id, v_uid)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Append the review event to history
  INSERT INTO public.review_logs (
    card_id, member_id,
    rating, state, due,
    stability, difficulty,
    scheduled_days,
    review,
    session_id
  )
  VALUES (
    p_card_id, v_uid,
    (p_log).rating, (p_log).state, (p_log).due,
    (p_log).stability, (p_log).difficulty,
    (p_log).scheduled_days,
    (p_log).review,
    p_session_id
  )
  -- Idempotent replay: a retried save (offline recovery) re-runs the exact same
  -- review event, so swallow the duplicate rather than growing history. The
  -- reviews upsert above is already idempotent via ON CONFLICT (card_id).
  ON CONFLICT (member_id, card_id, review) DO NOTHING;
END;
$function$
;

grant delete on table "public"."study_sessions" to "anon";

grant insert on table "public"."study_sessions" to "anon";

grant references on table "public"."study_sessions" to "anon";

grant select on table "public"."study_sessions" to "anon";

grant trigger on table "public"."study_sessions" to "anon";

grant truncate on table "public"."study_sessions" to "anon";

grant update on table "public"."study_sessions" to "anon";

grant delete on table "public"."study_sessions" to "authenticated";

grant insert on table "public"."study_sessions" to "authenticated";

grant references on table "public"."study_sessions" to "authenticated";

grant select on table "public"."study_sessions" to "authenticated";

grant trigger on table "public"."study_sessions" to "authenticated";

grant truncate on table "public"."study_sessions" to "authenticated";

grant update on table "public"."study_sessions" to "authenticated";

grant delete on table "public"."study_sessions" to "service_role";

grant insert on table "public"."study_sessions" to "service_role";

grant references on table "public"."study_sessions" to "service_role";

grant select on table "public"."study_sessions" to "service_role";

grant trigger on table "public"."study_sessions" to "service_role";

grant truncate on table "public"."study_sessions" to "service_role";

grant update on table "public"."study_sessions" to "service_role";


  create policy "Members can view their own study sessions"
  on "public"."study_sessions"
  as permissive
  for select
  to authenticated
using ((( SELECT public.active_member_id() AS active_member_id) = member_id));



