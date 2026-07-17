-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_desired_retention_override integer, p_learning_steps_override text[], p_relearning_steps_override text[], p_has_max_reviews_override boolean, p_max_reviews_per_day_override integer, p_has_max_new_override boolean, p_max_new_per_day_override integer) RETURNS TABLE(id bigint, created_at timestamp with time zone, updated_at timestamp with time zone, description text, is_public boolean, title text, member_id uuid, member_display_name text, tags text[], has_image boolean, study_config jsonb, cover_config jsonb, card_attributes jsonb, card_count integer, reviewed_today_count integer, new_reviewed_today_count integer, due_count integer, rank numeric, review_pacing_preset_id bigint, desired_retention integer, learning_steps text[], relearning_steps text[], desired_retention_override integer, learning_steps_override text[], relearning_steps_override text[], max_reviews_per_day integer, max_new_per_day integer, has_max_reviews_override boolean, max_reviews_per_day_override integer, has_max_new_override boolean, max_new_per_day_override integer)
    LANGUAGE plpgsql
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


ALTER FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_desired_retention_override integer, p_learning_steps_override text[], p_relearning_steps_override text[], p_has_max_reviews_override boolean, p_max_reviews_per_day_override integer, p_has_max_new_override boolean, p_max_new_per_day_override integer) OWNER TO postgres;


GRANT ALL ON FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_desired_retention_override integer, p_learning_steps_override text[], p_relearning_steps_override text[], p_has_max_reviews_override boolean, p_max_reviews_per_day_override integer, p_has_max_new_override boolean, p_max_new_per_day_override integer) TO anon;
GRANT ALL ON FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_desired_retention_override integer, p_learning_steps_override text[], p_relearning_steps_override text[], p_has_max_reviews_override boolean, p_max_reviews_per_day_override integer, p_has_max_new_override boolean, p_max_new_per_day_override integer) TO authenticated;
GRANT ALL ON FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_desired_retention_override integer, p_learning_steps_override text[], p_relearning_steps_override text[], p_has_max_reviews_override boolean, p_max_reviews_per_day_override integer, p_has_max_new_override boolean, p_max_new_per_day_override integer) TO service_role;

