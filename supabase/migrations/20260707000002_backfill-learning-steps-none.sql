-- =============================================================================
-- Backfill members.preferences.study.{learning,relearning}_steps: [] → ["1d"]
-- =============================================================================
--
-- The "None" preset (empty array) is being removed from settings for both
-- learning and relearning steps, in favor of "1d" — an empty array causes
-- ts-fsrs to skip the short learning/relearning phase entirely and jump
-- straight to a full FSRS-computed interval on the very first "Again",
-- which is surprising and was the direct cause of a reported bug (failed
-- cards not resurfacing for days). Any member who has either set today
-- needs their stored preference migrated so the settings UI (which no
-- longer offers "None") reflects reality.
-- =============================================================================

BEGIN;

UPDATE public.members
SET preferences = jsonb_set(preferences, '{study,relearning_steps}', '["1d"]'::jsonb)
WHERE preferences->'study'->'relearning_steps' = '[]'::jsonb;

UPDATE public.members
SET preferences = jsonb_set(preferences, '{study,learning_steps}', '["1d"]'::jsonb)
WHERE preferences->'study'->'learning_steps' = '[]'::jsonb;

COMMIT;
