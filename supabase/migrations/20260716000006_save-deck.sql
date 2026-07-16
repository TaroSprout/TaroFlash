-- Single write RPC for deck-settings save: creates or updates the decks row
-- and upserts its deck_review_pacing sidecar row in one transaction, then
-- returns the fully resolved deck (same shape get_member_decks returns) so
-- the FE never has to stitch two writes or two reads together.
--
-- p_deck_id NULL means "create a new deck" (member_id + rank come from
-- decks' own BEFORE INSERT triggers, same as every other deck insert).
-- Non-null means "update" — ownership is enforced by decks' existing RLS
-- UPDATE policy, not by a manual check here: if the UPDATE matches zero
-- rows (wrong owner, or the id doesn't exist), RETURNING leaves v_deck_id
-- NULL and the function raises instead of silently upserting pacing for
-- a deck that was never touched.

BEGIN;

CREATE FUNCTION public.save_deck(
  p_deck_id bigint,
  p_title text,
  p_description text,
  p_is_public boolean,
  p_study_config jsonb,
  p_cover_config jsonb,
  p_card_attributes jsonb,
  p_review_pacing_preset_id bigint,
  p_desired_retention_override integer,
  p_learning_steps_override text[],
  p_relearning_steps_override text[],
  p_has_max_reviews_override boolean,
  p_max_reviews_per_day_override integer,
  p_has_max_new_override boolean,
  p_max_new_per_day_override integer
)
RETURNS TABLE (
  id                            bigint,
  created_at                    timestamptz,
  updated_at                    timestamptz,
  description                   text,
  is_public                     boolean,
  title                         text,
  member_id                     uuid,
  member_display_name           text,
  tags                          text[],
  has_image                     boolean,
  study_config                  jsonb,
  cover_config                  jsonb,
  card_attributes                jsonb,
  card_count                    int,
  reviewed_today_count          int,
  new_reviewed_today_count      int,
  due_count                     int,
  rank                          numeric,
  review_pacing_preset_id       bigint,
  desired_retention              integer,
  learning_steps                text[],
  relearning_steps              text[],
  desired_retention_override    integer,
  learning_steps_override       text[],
  relearning_steps_override     text[],
  max_reviews_per_day           integer,
  max_new_per_day               integer,
  has_max_reviews_override      boolean,
  max_reviews_per_day_override  integer,
  has_max_new_override          boolean,
  max_new_per_day_override      integer
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_deck_id bigint;
BEGIN
  IF p_deck_id IS NULL THEN
    INSERT INTO public.decks (title, description, is_public, study_config, cover_config, card_attributes)
    VALUES (p_title, p_description, p_is_public, p_study_config, p_cover_config, p_card_attributes)
    RETURNING decks.id INTO v_deck_id;
  ELSE
    UPDATE public.decks
    SET title = p_title,
        description = p_description,
        is_public = p_is_public,
        study_config = p_study_config,
        cover_config = p_cover_config,
        card_attributes = p_card_attributes,
        updated_at = now()
    WHERE decks.id = p_deck_id
    RETURNING decks.id INTO v_deck_id;

    IF v_deck_id IS NULL THEN
      RAISE EXCEPTION 'deck % not found or not owned by caller', p_deck_id;
    END IF;
  END IF;

  INSERT INTO public.deck_review_pacing (
    deck_id, review_pacing_preset_id, desired_retention_override, learning_steps_override, relearning_steps_override,
    has_max_reviews_override, max_reviews_per_day_override, has_max_new_override, max_new_per_day_override
  )
  VALUES (
    v_deck_id, p_review_pacing_preset_id, p_desired_retention_override, p_learning_steps_override, p_relearning_steps_override,
    p_has_max_reviews_override, p_max_reviews_per_day_override, p_has_max_new_override, p_max_new_per_day_override
  )
  ON CONFLICT (deck_id) DO UPDATE SET
    review_pacing_preset_id = EXCLUDED.review_pacing_preset_id,
    desired_retention_override = EXCLUDED.desired_retention_override,
    learning_steps_override = EXCLUDED.learning_steps_override,
    relearning_steps_override = EXCLUDED.relearning_steps_override,
    has_max_reviews_override = EXCLUDED.has_max_reviews_override,
    max_reviews_per_day_override = EXCLUDED.max_reviews_per_day_override,
    has_max_new_override = EXCLUDED.has_max_new_override,
    max_new_per_day_override = EXCLUDED.max_new_per_day_override;

  RETURN QUERY SELECT * FROM public.get_member_decks(now()) gmd WHERE gmd.id = v_deck_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_deck(
  bigint, text, text, boolean, jsonb, jsonb, jsonb,
  bigint, integer, text[], text[],
  boolean, integer, boolean, integer
) TO authenticated;

COMMIT;
