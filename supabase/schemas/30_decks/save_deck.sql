-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_pacing_overrides jsonb) RETURNS SETOF public.member_deck
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

  -- Sidecar carries just the preset link + the overrides bag now; every
  -- per-field override/has_* column collapsed into p_pacing_overrides.
  INSERT INTO public.deck_review_pacing (deck_id, review_pacing_preset_id, overrides)
  VALUES (v_deck_id, p_review_pacing_preset_id, COALESCE(p_pacing_overrides, '{}'::jsonb))
  ON CONFLICT (deck_id) DO UPDATE SET
    review_pacing_preset_id = EXCLUDED.review_pacing_preset_id,
    overrides = EXCLUDED.overrides;

  RETURN QUERY SELECT * FROM public.get_member_decks(now()) gmd WHERE gmd.id = v_deck_id;
END;
$$;


ALTER FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_pacing_overrides jsonb) OWNER TO postgres;


GRANT ALL ON FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_pacing_overrides jsonb) TO anon;
GRANT ALL ON FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_pacing_overrides jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_pacing_overrides jsonb) TO service_role;
