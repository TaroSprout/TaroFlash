-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

-- Single-request bootstrap for a study session over one or more decks. Returns
-- everything the FE session needs in one round-trip:
--
--   { "decks": [ <slim resolved deck>, ... ],       -- requested order
--     "cards": [ <card + embedded review>, ... ] }  -- merged study queue
--
-- `cards` is the same due/new selection (per-deck daily caps, new/review
-- partition, interleave) as get_study_session_cards, but merged across every
-- requested deck. Decks are studied in the given order (an unshuffled session
-- studies deck 1's cards, then deck 2's, ...); ordering inside a deck is the
-- selection function's own interleave. `decks` carries the per-deck appearance
-- + resolved pacing the deck-blind session core needs to schedule each card.
--
-- SECURITY INVOKER (the default): RLS on decks/cards/reviews runs as the caller,
-- so a member only ever sees their own rows even if they pass a foreign deck id.
CREATE FUNCTION public.get_session_decks_and_cards(p_deck_ids bigint[], p_today_start timestamp with time zone) RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
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
          'flip_cards', COALESCE((dk.study_config->>'flip_cards')::boolean, false),
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
$$;


ALTER FUNCTION public.get_session_decks_and_cards(p_deck_ids bigint[], p_today_start timestamp with time zone) OWNER TO postgres;


GRANT ALL ON FUNCTION public.get_session_decks_and_cards(p_deck_ids bigint[], p_today_start timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.get_session_decks_and_cards(p_deck_ids bigint[], p_today_start timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.get_session_decks_and_cards(p_deck_ids bigint[], p_today_start timestamp with time zone) TO service_role;
