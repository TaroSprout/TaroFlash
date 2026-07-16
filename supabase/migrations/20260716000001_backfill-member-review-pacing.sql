-- Backfill: members.preferences.study.{desired_retention,learning_steps,
-- relearning_steps} is being retired in favor of per-deck presets
-- (20260716000000_review-pacing-presets.sql). For any member whose values
-- there differ from the old member-wide defaults, clone those exact values
-- into a personal preset and assign it to every deck they own — so nobody's
-- actual scheduling behavior changes the moment this ships. Members already
-- on the defaults get nothing (they resolve to the system preset).

BEGIN;

DO $$
DECLARE
  m RECORD;
  v_preset_id bigint;
  v_desired_retention integer;
  v_learning_steps text[];
  v_relearning_steps text[];
BEGIN
  FOR m IN SELECT id, preferences FROM public.members
  LOOP
    v_desired_retention := COALESCE((m.preferences->'study'->>'desired_retention')::integer, 90);

    v_learning_steps := CASE
      WHEN m.preferences->'study'->'learning_steps' IS NULL THEN ARRAY['1m', '10m']
      ELSE ARRAY(SELECT jsonb_array_elements_text(m.preferences->'study'->'learning_steps'))
    END;

    v_relearning_steps := CASE
      WHEN m.preferences->'study'->'relearning_steps' IS NULL THEN ARRAY['10m']
      ELSE ARRAY(SELECT jsonb_array_elements_text(m.preferences->'study'->'relearning_steps'))
    END;

    IF v_desired_retention = 90
       AND v_learning_steps = ARRAY['1m', '10m']
       AND v_relearning_steps = ARRAY['10m'] THEN
      CONTINUE;
    END IF;

    INSERT INTO public.review_pacing_presets (member_id, name, desired_retention, learning_steps, relearning_steps)
    VALUES (m.id, 'My Pacing', v_desired_retention, v_learning_steps, v_relearning_steps)
    RETURNING id INTO v_preset_id;

    UPDATE public.decks SET review_pacing_preset_id = v_preset_id WHERE member_id = m.id;
  END LOOP;
END $$;

COMMIT;
