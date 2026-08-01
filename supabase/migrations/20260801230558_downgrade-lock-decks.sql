drop policy "members can update their own non-privileged fields" on "public"."members";

alter table "public"."members" add column "downgrade_delete_at" timestamp with time zone;

-- ADD ATTRIBUTE rather than the drop/recreate `supabase db diff` emitted: the
-- type is the return type of get_member_decks and save_deck, so a plain DROP
-- fails on the dependency. CASCADE recompiles those dependents in place.
alter type "public"."member_deck" add attribute "is_locked" boolean cascade;
alter type "public"."member_deck" add attribute "locked_delete_at" timestamp with time zone cascade;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.begin_downgrade_grace(p_member_id uuid)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  -- The grace window lives here, in the only writer of downgrade_delete_at.
  v_grace    interval := interval '15 days';
  v_deadline timestamptz;
  v_limit    int;
  v_count    int;
BEGIN
  SELECT m.downgrade_delete_at, p.deck_limit
    INTO v_deadline, v_limit
  FROM public.members m
  JOIN public.plans p ON p.id = m.plan
  WHERE m.id = p_member_id
  FOR UPDATE OF m;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No member %', p_member_id USING errcode = 'no_data_found';
  END IF;

  IF v_deadline IS NOT NULL THEN
    RETURN v_deadline;
  END IF;

  -- NULL deck_limit = unlimited plan: nothing is ever over the line.
  IF v_limit IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.decks
  WHERE member_id = p_member_id;

  IF v_count <= v_limit THEN
    RETURN NULL;
  END IF;

  v_deadline := now() + v_grace;

  UPDATE public.members
  SET downgrade_delete_at = v_deadline
  WHERE id = p_member_id;

  RETURN v_deadline;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.clear_downgrade_grace(p_member_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.members
  SET downgrade_delete_at = NULL
  WHERE id = p_member_id
    AND downgrade_delete_at IS NOT NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.deck_lock_deadline(p_deck_id bigint)
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE
AS $function$
  SELECT m.downgrade_delete_at
  FROM public.decks d
  JOIN public.members m ON m.id = d.member_id
  JOIN public.plans p ON p.id = m.plan
  WHERE d.id = p_deck_id
    AND m.plan = 'free'
    AND m.downgrade_delete_at IS NOT NULL
    AND p.deck_limit IS NOT NULL
    AND (
      SELECT count(*)
      FROM public.decks d2
      WHERE d2.member_id = d.member_id
        AND d2.rank < d.rank
    ) >= p.deck_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.purge_downgraded_decks()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.decks d
  USING public.members m, public.plans p
  WHERE d.member_id = m.id
    AND p.id = m.plan
    AND m.plan = 'free'
    AND m.downgrade_delete_at IS NOT NULL
    AND m.downgrade_delete_at <= now()
    AND p.deck_limit IS NOT NULL
    AND (
      SELECT count(*)
      FROM public.decks d2
      WHERE d2.member_id = d.member_id
        AND d2.rank < d.rank
    ) >= p.deck_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_member_decks(p_today_start timestamp with time zone)
 RETURNS SETOF public.member_deck
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    d.id,
    d.created_at,
    d.updated_at,
    d.description,
    d.is_public,
    d.title,
    d.member_id,
    m.display_name AS member_display_name,
    d.tags,
    d.has_image,
    d.study_config,
    d.cover_config,
    d.card_attributes,

    (
      SELECT count(*)::int
      FROM public.cards c
      WHERE c.deck_id = d.id
    ) AS card_count,

    stats.reviewed_today_count,
    stats.new_reviewed_today_count,

    -- new_take + review_take, matching get_study_session_cards exactly.
    -- COALESCE(cap - used, INT_MAX) treats a NULL cap as unbounded. A locked
    -- deck reports 0 so it drops out of the review inbox and "study all due" —
    -- study is barred there too (get_study_session_cards returns nothing).
    CASE WHEN lock.deadline IS NOT NULL THEN 0 ELSE
      GREATEST(
        0,
        LEAST(stats.new_available, stats.remaining_new, stats.remaining_total)
      )
      + GREATEST(
        0,
        LEAST(
          stats.review_available,
          stats.remaining_total
            - GREATEST(0, LEAST(stats.new_available, stats.remaining_new, stats.remaining_total))
        )
      )
    END AS due_count,

    d.rank,

    dp.review_pacing_preset_id,

    -- All seven resolved pacing fields come from the shared resolver — the
    -- override -> preset -> system ladder lives only in resolve_deck_pacing now.
    rp.desired_retention,
    rp.learning_steps,
    rp.relearning_steps,
    rp.max_reviews_per_day,
    rp.max_new_per_day,
    rp.leech_threshold,
    rp.max_interval,

    dp.overrides AS pacing_overrides,

    -- Locked flag + deletion date the dashboard renders. Both fall out of the
    -- one deck_lock_deadline read: non-NULL deadline ⇒ locked.
    (lock.deadline IS NOT NULL) AS is_locked,
    lock.deadline AS locked_delete_at

  FROM public.decks d
  LEFT JOIN LATERAL public.member_public_profile(d.member_id) m ON true
  LEFT JOIN public.deck_review_pacing dp ON dp.deck_id = d.id
  CROSS JOIN LATERAL public.resolve_deck_pacing(d.id) AS rp
  CROSS JOIN LATERAL (SELECT public.deck_lock_deadline(d.id) AS deadline) AS lock
  CROSS JOIN LATERAL (
    SELECT
      (
        SELECT count(DISTINCT rl.card_id)::int
        FROM public.review_logs rl
        JOIN public.cards c ON c.id = rl.card_id
        WHERE c.deck_id = d.id
          AND rl.review >= p_today_start
      ) AS reviewed_today_count,

      (
        SELECT count(DISTINCT rl.card_id)::int
        FROM public.review_logs rl
        JOIN public.cards c ON c.id = rl.card_id
        WHERE c.deck_id = d.id
          AND rl.state = 0
          AND rl.review >= p_today_start
      ) AS new_reviewed_today_count,

      -- Cards with no reviews row at all = brand-new.
      (
        SELECT count(*)::int
        FROM public.cards c
        LEFT JOIN public.reviews r ON r.card_id = c.id
        WHERE c.deck_id = d.id
          AND r.id IS NULL
      ) AS new_available,

      -- Cards with a reviews row whose due date has passed.
      (
        SELECT count(*)::int
        FROM public.cards c
        JOIN public.reviews r ON r.card_id = c.id
        WHERE c.deck_id = d.id
          AND r.due <= now()
      ) AS review_available,

      GREATEST(
        0,
        COALESCE(
          rp.max_reviews_per_day - (
            SELECT count(DISTINCT rl.card_id)::int
            FROM public.review_logs rl
            JOIN public.cards c ON c.id = rl.card_id
            WHERE c.deck_id = d.id
              AND rl.review >= p_today_start
          ),
          2147483647
        )
      ) AS remaining_total,

      GREATEST(
        0,
        COALESCE(
          rp.max_new_per_day - (
            SELECT count(DISTINCT rl.card_id)::int
            FROM public.review_logs rl
            JOIN public.cards c ON c.id = rl.card_id
            WHERE c.deck_id = d.id
              AND rl.state = 0
              AND rl.review >= p_today_start
          ),
          2147483647
        )
      ) AS remaining_new
  ) AS stats;
$function$
;

CREATE OR REPLACE FUNCTION public.get_session_decks_and_cards(p_deck_ids bigint[], p_today_start timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  SELECT jsonb_build_object(
    'decks', COALESCE(decks.arr, '[]'::jsonb),
    'cards', COALESCE(cards.arr, '[]'::jsonb)
  )
  FROM
    -- One slim resolved record per requested deck, in requested order. Pacing
    -- comes straight from resolve_deck_pacing so the ladder lives in one place.
    (
      SELECT jsonb_agg(deck_json ORDER BY d.ord) AS arr
      FROM unnest(p_deck_ids) WITH ORDINALITY AS d(deck_id, ord)
      CROSS JOIN LATERAL public.resolve_deck_pacing(d.deck_id) AS rp
      CROSS JOIN LATERAL (
        SELECT jsonb_build_object(
          'id', dk.id,
          'title', dk.title,
          'starting_side', COALESCE(dk.study_config->>'starting_side', 'front'),
          'shuffle', COALESCE((dk.study_config->>'shuffle')::boolean, false),
          'cover_config', dk.cover_config,
          'card_attributes', dk.card_attributes,
          'desired_retention', rp.desired_retention,
          'learning_steps', rp.learning_steps,
          'relearning_steps', rp.relearning_steps,
          'leech_threshold', rp.leech_threshold,
          'max_interval', rp.max_interval
        ) AS deck_json
        FROM public.decks dk
        WHERE dk.id = d.deck_id
          -- A locked deck contributes nothing to a session: no deck record and
          -- (via get_study_session_cards below) no cards.
          AND public.deck_lock_deadline(dk.id) IS NULL
      ) AS deck_row
    ) AS decks,

    -- Merged study queue. Reuse get_study_session_cards per deck (it owns the
    -- caps + partition + interleave logic) via a lateral join over the deck ids.
    -- card_ord is captured over the raw function output — row_number() with an
    -- empty window numbers rows in the order the function emitted them, before
    -- the reviews join can perturb it — so the final ORDER BY reproduces the
    -- selection's order within each deck, decks stitched together by d.ord.
    (
      SELECT jsonb_agg(q.card_json ORDER BY d.ord, q.card_ord) AS arr
      FROM unnest(p_deck_ids) WITH ORDINALITY AS d(deck_id, ord)
      CROSS JOIN LATERAL (
        SELECT
          to_jsonb(sc.card) || jsonb_build_object(
            'review',
            CASE WHEN r.id IS NULL THEN NULL ELSE to_jsonb(r) END
          ) AS card_json,
          sc.card_ord
        FROM (
          SELECT g AS card, row_number() OVER () AS card_ord
          FROM public.get_study_session_cards(d.deck_id, p_today_start) AS g
        ) sc
        LEFT JOIN public.reviews r ON r.card_id = (sc.card).id
      ) AS q
    ) AS cards;
$function$
;

CREATE OR REPLACE FUNCTION public.get_study_session_cards(p_deck_id bigint, p_today_start timestamp with time zone)
 RETURNS SETOF public.cards_with_images
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_max_total       int;
  v_max_new         int;
  v_used_total      int;
  v_used_new        int;
  v_remaining_total int;
  v_remaining_new   int;
  v_new_available   int;
  v_new_take        int;
  v_review_take     int;
BEGIN
  -- A locked deck yields no study cards at all — study is barred while the
  -- downgrade grace runs, even though the deck stays fully readable/editable.
  IF public.deck_lock_deadline(p_deck_id) IS NOT NULL THEN
    RETURN;
  END IF;

  -- Read the resolved daily caps (NULL = unlimited) via the shared resolver.
  SELECT rp.max_reviews_per_day, rp.max_new_per_day
  INTO v_max_total, v_max_new
  FROM public.resolve_deck_pacing(p_deck_id) rp;

  -- Today's usage: distinct cards reviewed since the member's local midnight.
  SELECT
    count(DISTINCT rl.card_id)::int,
    count(DISTINCT rl.card_id) FILTER (WHERE rl.state = 0)::int
  INTO v_used_total, v_used_new
  FROM public.review_logs rl
  JOIN public.cards c ON c.id = rl.card_id
  WHERE c.deck_id = p_deck_id
    AND rl.review >= p_today_start;

  -- Remaining budget. NULL cap → sentinel large int meaning unlimited.
  v_remaining_total := GREATEST(0, COALESCE(v_max_total - v_used_total, 2147483647));
  v_remaining_new   := GREATEST(0, COALESCE(v_max_new   - v_used_new,   2147483647));

  -- How many new cards exist in this deck (no review row yet).
  SELECT count(*)::int
  INTO v_new_available
  FROM public.cards c
  LEFT JOIN public.reviews r ON r.card_id = c.id
  WHERE c.deck_id = p_deck_id
    AND r.id IS NULL;

  -- New cards drawn first for budget purposes; review cards fill the rest.
  -- (This only decides *how many* of each — final ordering interleaves them.)
  v_new_take    := LEAST(v_new_available, v_remaining_new, v_remaining_total);
  v_review_take := GREATEST(0, v_remaining_total - v_new_take);

  RETURN QUERY
  WITH new_queue AS (
    -- row_number() OVER (ORDER BY c.rank) numbers each row 1..v_new_take in
    -- rank order, without collapsing rows the way an aggregate would.
    SELECT c.id, 1 AS bucket, row_number() OVER (ORDER BY c.rank) AS rn
    FROM public.cards c
    LEFT JOIN public.reviews r ON r.card_id = c.id
    WHERE c.deck_id = p_deck_id
      AND r.id IS NULL
    ORDER BY c.rank
    LIMIT v_new_take
  ),
  review_queue AS (
    -- Most-overdue-first: order by due ASC (oldest due date = most overdue),
    -- not rank. rank only breaks ties between cards due at the same instant.
    SELECT c.id, 2 AS bucket, row_number() OVER (ORDER BY r.due ASC, c.rank) AS rn
    FROM public.cards c
    JOIN public.reviews r ON r.card_id = c.id
    WHERE c.deck_id = p_deck_id
      AND r.due <= now()
    ORDER BY r.due ASC, c.rank
    LIMIT v_review_take
  ),
  queue AS (
    -- Proportional interleave: each bucket's row gets a key in (0, 1] based
    -- on its position within that bucket alone (e.g. new card 2 of 5 → 0.3).
    -- Sorting all rows by that shared key spreads new cards evenly through
    -- the review cards instead of grouping all of one bucket before the other.
    SELECT id, bucket, (rn - 0.5) / NULLIF(v_new_take, 0) AS interleave_key
    FROM new_queue
    UNION ALL
    SELECT id, bucket, (rn - 0.5) / NULLIF(v_review_take, 0) AS interleave_key
    FROM review_queue
  )
  SELECT cwi.*
  FROM public.cards_with_images cwi
  JOIN queue q ON q.id = cwi.id
  ORDER BY q.interleave_key, q.bucket;
END;
$function$
;

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
  WHERE (members_1.id = auth.uid())))) AND (NOT (downgrade_delete_at IS DISTINCT FROM ( SELECT members_1.downgrade_delete_at
   FROM public.members members_1
  WHERE (members_1.id = auth.uid()))))));



