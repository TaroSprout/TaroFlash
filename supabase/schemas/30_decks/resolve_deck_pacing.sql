-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

-- The seven fully-resolved pacing values for a deck. One row shape so every
-- consumer (get_member_decks, get_study_session_cards, get_session_decks_and_cards)
-- reads the same fields instead of re-deriving the ladder.
CREATE TYPE public.resolved_pacing AS (
    desired_retention   integer,
    learning_steps      text[],
    relearning_steps    text[],
    max_reviews_per_day integer,
    max_new_per_day     integer,
    leech_threshold     integer,
    max_interval        integer
);


ALTER TYPE public.resolved_pacing OWNER TO postgres;


-- Resolve one deck's pacing down the ladder: a pinned per-field override
-- (`overrides ? '<key>'` = key present, so a pinned null resolves to null =
-- uncapped for the daily limits) -> the linked preset -> the system preset.
-- Daily limits + max_interval stay nullable (null = uncapped); the rest are
-- always populated because the system preset defines them NOT NULL.
CREATE FUNCTION public.resolve_deck_pacing(p_deck_id bigint) RETURNS public.resolved_pacing
    LANGUAGE sql STABLE
    AS $$
  SELECT
    CASE
      WHEN dp.overrides ? 'desired_retention' THEN (dp.overrides->>'desired_retention')::int
      WHEN p.id IS NOT NULL THEN p.desired_retention
      ELSE sys.desired_retention
    END,
    CASE
      WHEN dp.overrides ? 'learning_steps' THEN ARRAY(SELECT jsonb_array_elements_text(dp.overrides->'learning_steps'))
      WHEN p.id IS NOT NULL THEN p.learning_steps
      ELSE sys.learning_steps
    END,
    CASE
      WHEN dp.overrides ? 'relearning_steps' THEN ARRAY(SELECT jsonb_array_elements_text(dp.overrides->'relearning_steps'))
      WHEN p.id IS NOT NULL THEN p.relearning_steps
      ELSE sys.relearning_steps
    END,
    CASE
      WHEN dp.overrides ? 'max_reviews_per_day' THEN (dp.overrides->>'max_reviews_per_day')::int
      WHEN p.id IS NOT NULL THEN p.max_reviews_per_day
      ELSE sys.max_reviews_per_day
    END,
    CASE
      WHEN dp.overrides ? 'max_new_per_day' THEN (dp.overrides->>'max_new_per_day')::int
      WHEN p.id IS NOT NULL THEN p.max_new_per_day
      ELSE sys.max_new_per_day
    END,
    CASE
      WHEN dp.overrides ? 'leech_threshold' THEN (dp.overrides->>'leech_threshold')::int
      WHEN p.id IS NOT NULL THEN p.leech_threshold
      ELSE sys.leech_threshold
    END,
    CASE
      WHEN dp.overrides ? 'max_interval' THEN (dp.overrides->>'max_interval')::int
      WHEN p.id IS NOT NULL THEN p.max_interval
      ELSE sys.max_interval
    END
  FROM public.decks d
  LEFT JOIN public.deck_review_pacing dp ON dp.deck_id = d.id
  LEFT JOIN public.review_pacing_presets p ON p.id = dp.review_pacing_preset_id
  CROSS JOIN (
    SELECT desired_retention, learning_steps, relearning_steps, max_reviews_per_day, max_new_per_day, leech_threshold, max_interval
    FROM public.review_pacing_presets
    WHERE is_system
    LIMIT 1
  ) sys
  WHERE d.id = p_deck_id;
$$;


ALTER FUNCTION public.resolve_deck_pacing(p_deck_id bigint) OWNER TO postgres;


GRANT ALL ON FUNCTION public.resolve_deck_pacing(p_deck_id bigint) TO anon;
GRANT ALL ON FUNCTION public.resolve_deck_pacing(p_deck_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.resolve_deck_pacing(p_deck_id bigint) TO service_role;
