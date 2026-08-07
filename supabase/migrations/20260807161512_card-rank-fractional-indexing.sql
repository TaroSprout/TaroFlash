-- =============================================================================
-- Card ranks: numeric(20,6) → base62 fractional-indexing keys
-- =============================================================================
--
-- Ordering keys are now computed on the client (src/utils/card/rank.ts, wrapping
-- the `fractional-indexing` package), so every rank-computing RPC goes: an
-- offline insert can't call one, and a stubbed numeric rank can't be merged on
-- reconnect. What's left is a plain RLS-guarded insert/update.
--
-- The column MUST be C-collated. This database is en_US.UTF-8, whose collation
-- reorders case and ignores punctuation — base62 keys are case-sensitive and
-- compare byte-wise, so under the default collation the server would sort keys
-- differently from the client that generated them.
--
-- Dropped with the numeric scheme: card_rank_between, reindex_deck_ranks, the
-- P0001 reindex/retry catches, and the pg_advisory_xact_lock serialization —
-- all of which existed only because midpoint ranks run out of room.
-- =============================================================================

drop function if exists "public"."bulk_insert_cards_in_deck"(p_deck_id bigint, p_cards jsonb);

drop function if exists "public"."card_rank_between"(p_deck_id bigint, p_left_card_id bigint, p_right_card_id bigint);

drop function if exists "public"."enforce_deck_card_limit"(p_deck_id bigint, p_adding integer);

drop function if exists "public"."insert_card_at"(p_deck_id bigint, p_anchor_id bigint, p_side text, p_front_text text, p_back_text text, p_note text);

drop function if exists "public"."move_card"(p_card_id bigint, p_anchor_id bigint, p_side text);

drop function if exists "public"."move_cards_to_deck"(p_target_deck_id bigint, p_card_ids bigint[], p_source_deck_id bigint, p_except_ids bigint[]);

drop function if exists "public"."reindex_deck_ranks"(p_deck_id bigint);

drop function if exists "public"."reserve_card"(p_deck_id bigint, p_left_card_id bigint, p_right_card_id bigint);

-- RETURNS SETOF cards_with_images, so it holds a hard dependency on the view's
-- row type and blocks the drop. Recreated verbatim further down — its body is
-- unchanged, it just can't outlive the rank column's type.
drop function if exists "public"."get_study_session_cards"(p_deck_id bigint, p_today_start timestamp with time zone);

drop view if exists "public"."cards_with_images";

drop function if exists "public"."get_cards_in_deck"(p_deck_id bigint, p_sort_by text, p_query text, p_offset integer, p_limit integer);

drop index if exists "public"."cards_deck_rank_idx";

alter table "public"."cards" alter column "rank" set data type text collate "C" using "rank"::text;

-- The cast above preserves the *digits*, not the order: '10000.000000' sorts
-- before '2000.000000' byte-wise, and neither is a well-formed key. Relabel
-- every card in its existing (rank, id) order, recovering that order by casting
-- back to numeric while the values still look numeric.
--
-- Keys are literal, not generated — no reimplementation of the packing
-- algorithm, which stays JS-only. 'a0' is the canonical integer part the package
-- itself starts at; the fixed-width digits that follow sort lexicographically in
-- the same order they sort numerically, and the trailing '1' keeps the key off a
-- trailing zero (which the package rejects as non-canonical). Room for 999,999
-- cards per deck, against a paid cap three orders of magnitude below that.
update public.cards c
   set rank = 'a0' || lpad(o.rn::text, 6, '0') || '1'
  from (
    select id,
           row_number() over (partition by deck_id order by rank::numeric, id) as rn
      from public.cards
  ) o
 where c.id = o.id;

CREATE INDEX cards_deck_rank_idx ON public.cards USING btree (deck_id, rank, id);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.assert_deck_card_limits(p_deck_ids bigint[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_limit int;
BEGIN
  IF COALESCE(array_length(p_deck_ids, 1), 0) = 0 THEN
    RETURN;
  END IF;

  SELECT p.cards_per_deck_limit
    INTO v_limit
    FROM public.members m
    JOIN public.plans   p ON p.id = m.plan
   WHERE m.id = auth.uid();

  -- Unlimited tier, or a caller with no member row (service-role backfills,
  -- seeds) → no cap to enforce.
  IF v_limit IS NULL THEN
    RETURN;
  END IF;

  PERFORM 1
     FROM public.cards c
    WHERE c.deck_id = ANY(p_deck_ids)
    GROUP BY c.deck_id
   HAVING count(*) > v_limit;

  IF FOUND THEN
    RAISE EXCEPTION 'deck_card_limit_exceeded'
      USING ERRCODE = 'PT402',
            DETAIL  = format('Plan allows max %s cards per deck', v_limit),
            HINT    = 'Upgrade the plan to raise the per-deck card cap';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_deck_card_limit_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM public.assert_deck_card_limits(
    ARRAY(SELECT DISTINCT n.deck_id FROM new_rows n WHERE n.deck_id IS NOT NULL)
  );

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_deck_card_limit_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM public.assert_deck_card_limits(
    ARRAY(
      SELECT DISTINCT n.deck_id
        FROM new_rows n
        JOIN old_rows o ON o.id = n.id
       WHERE n.deck_id IS DISTINCT FROM o.deck_id
         AND n.deck_id IS NOT NULL
    )
  );

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_ranks text[], p_card_ids bigint[] DEFAULT NULL::bigint[], p_source_deck_id bigint DEFAULT NULL::bigint, p_except_ids bigint[] DEFAULT NULL::bigint[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_uid    uuid := auth.uid();
  v_mode   text;
  v_ids    bigint[];
  v_moving int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Dispatch: exactly one of p_card_ids / p_source_deck_id must be set.
  IF p_card_ids IS NOT NULL AND p_source_deck_id IS NULL THEN
    v_mode := 'explicit';
  ELSIF p_source_deck_id IS NOT NULL AND p_card_ids IS NULL THEN
    v_mode := 'select_all';
  ELSE
    RAISE EXCEPTION 'Pass exactly one of p_card_ids or p_source_deck_id';
  END IF;

  -- Target deck ownership (both modes).
  IF NOT EXISTS (
    SELECT 1 FROM public.decks
     WHERE public.decks.id = p_target_deck_id AND public.decks.member_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Target deck not found or not owned by user';
  END IF;

  IF v_mode = 'explicit' THEN
    -- One count covers both "not yours" and "doesn't exist", matching the error
    -- surface the rest of this RPC family presents.
    IF (
      SELECT count(*) FROM public.cards
       WHERE public.cards.id = ANY(p_card_ids)
         AND public.cards.member_id = v_uid
    ) <> COALESCE(array_length(p_card_ids, 1), 0) THEN
      RAISE EXCEPTION 'One or more cards are not movable to this deck';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.decks
       WHERE public.decks.id = p_source_deck_id AND public.decks.member_id = v_uid
    ) THEN
      RAISE EXCEPTION 'Source deck not found or not owned by user';
    END IF;

    IF p_source_deck_id = p_target_deck_id THEN
      RAISE EXCEPTION 'Source and target decks must differ';
    END IF;
  END IF;

  -- The cards that will actually move, in the order they should land. Cards
  -- already sitting in the target are excluded rather than re-keyed, so a mixed
  -- selection leaves those exactly where they are. `id <> ALL(NULL)` evaluates
  -- to NULL, so the empty p_except_ids case is guarded explicitly — the same
  -- trick as delete_cards_in_deck.
  SELECT array_agg(c.id ORDER BY c.rank, c.id)
    INTO v_ids
    FROM public.cards c
   WHERE c.deck_id <> p_target_deck_id
     AND c.member_id = v_uid
     AND (
       CASE v_mode
         WHEN 'explicit' THEN c.id = ANY(p_card_ids)
         ELSE c.deck_id = p_source_deck_id
              AND (p_except_ids IS NULL OR c.id <> ALL(p_except_ids))
       END
     );

  v_moving := COALESCE(array_length(v_ids, 1), 0);

  -- Every selected card was already home. The caller did ask to move real,
  -- owned cards, so this is a no-op rather than an error.
  IF v_moving = 0 THEN
    RETURN;
  END IF;

  -- Too few keys means the deck grew between the caller sizing the run and this
  -- statement. Fail loudly: assigning a NULL rank would trip the NOT NULL
  -- constraint with a far less obvious message.
  IF v_moving > COALESCE(array_length(p_ranks, 1), 0) THEN
    RAISE EXCEPTION 'Got % ranks for % cards', COALESCE(array_length(p_ranks, 1), 0), v_moving;
  END IF;

  UPDATE public.cards AS c
     SET deck_id    = p_target_deck_id,
         rank       = p_ranks[ord.idx],
         updated_at = now()
    FROM unnest(v_ids) WITH ORDINALITY AS ord(card_id, idx)
   WHERE c.id = ord.card_id;
END;
$function$
;

create or replace view "public"."cards_with_images" as  SELECT c.id,
    c.created_at,
    c.updated_at,
    c.front_text,
    c.back_text,
    c.deck_id,
    c.member_id,
    c.rank,
    front.bucket AS front_image_bucket,
    front.path AS front_image_path,
    back.bucket AS back_image_bucket,
    back.path AS back_image_path,
    ((c.front_text <> ''::text) AND (c.back_text <> ''::text) AND (count(*) OVER (PARTITION BY c.deck_id, c.front_text, c.back_text) > 1)) AS is_duplicate
   FROM ((public.cards c
     LEFT JOIN public.media front ON (((front.card_id = c.id) AND (front.slot = 'card_front'::public.media_slot) AND (front.deleted_at IS NULL))))
     LEFT JOIN public.media back ON (((back.card_id = c.id) AND (back.slot = 'card_back'::public.media_slot) AND (back.deleted_at IS NULL))));


CREATE FUNCTION public.get_study_session_cards(p_deck_id bigint, p_today_start timestamp with time zone) RETURNS SETOF public.cards_with_images
    LANGUAGE plpgsql STABLE
    AS $$
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
$$;


ALTER FUNCTION public.get_study_session_cards(p_deck_id bigint, p_today_start timestamp with time zone) OWNER TO postgres;


GRANT ALL ON FUNCTION public.get_study_session_cards(p_deck_id bigint, p_today_start timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.get_study_session_cards(p_deck_id bigint, p_today_start timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.get_study_session_cards(p_deck_id bigint, p_today_start timestamp with time zone) TO service_role;


CREATE OR REPLACE FUNCTION public.get_cards_in_deck(p_deck_id bigint, p_sort_by text DEFAULT 'default'::text, p_query text DEFAULT NULL::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 50)
 RETURNS TABLE(id bigint, created_at timestamp with time zone, updated_at timestamp with time zone, front_text text, back_text text, deck_id bigint, member_id uuid, rank text, front_image_bucket text, front_image_path text, back_image_bucket text, back_image_path text, review jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    cwi.id,
    cwi.created_at,
    cwi.updated_at,
    cwi.front_text,
    cwi.back_text,
    cwi.deck_id,
    cwi.member_id,
    cwi.rank,
    cwi.front_image_bucket,
    cwi.front_image_path,
    cwi.back_image_bucket,
    cwi.back_image_path,
    -- Return NULL (not an all-null object) when no review row exists.
    CASE WHEN r.id IS NOT NULL THEN to_jsonb(r.*) END AS review
  FROM public.cards_with_images cwi
  LEFT JOIN public.reviews r ON r.card_id = cwi.id
  WHERE cwi.deck_id = p_deck_id
    AND (
      p_query IS NULL
      OR cwi.front_text ILIKE '%' || p_query || '%'
      OR cwi.back_text  ILIKE '%' || p_query || '%'
    )
  ORDER BY
    -- When p_sort_by = 'difficulty', sort by it DESC; cards with no review row
    -- (NULL difficulty) sink to the bottom via NULLS LAST. For all other values
    -- of p_sort_by this expression evaluates to NULL for every row, making it a
    -- no-op and falling through to the rank/id columns below.
    CASE WHEN p_sort_by = 'difficulty' THEN r.difficulty END DESC NULLS LAST,
    cwi.rank ASC,
    cwi.id   ASC
  OFFSET p_offset
  LIMIT  p_limit;
END;
$function$
;

CREATE TRIGGER enforce_deck_card_limit_on_insert AFTER INSERT ON public.cards REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.enforce_deck_card_limit_on_insert();

CREATE TRIGGER enforce_deck_card_limit_on_update AFTER UPDATE ON public.cards REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.enforce_deck_card_limit_on_update();


