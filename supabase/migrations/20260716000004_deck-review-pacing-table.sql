-- Splits deck-level review-pacing (preset link + per-field overrides) off
-- the decks table into its own 1:1 sidecar. decks was accumulating columns
-- for a concern (scheduling) that's orthogonal to its core (title, cards,
-- cover) — this keeps that concern isolated without costing the FE an extra
-- request: reads still go through one RPC (get_member_decks, next migration)
-- and writes still go through one RPC (save_deck, after that).
--
-- Daily-limit overrides need a *third* state beyond "override value" /
-- "not overridden" — "overridden to unbounded" — because unbounded is
-- itself expressed as NULL in review_pacing_presets.max_*_per_day. A single
-- nullable column can't tell "not overridden" apart from "overridden to
-- unbounded" (both are NULL), so each limit gets a has_*_override boolean
-- gate alongside its nullable override value.

BEGIN;

CREATE TABLE public.deck_review_pacing (
  deck_id bigint PRIMARY KEY REFERENCES public.decks(id) ON DELETE CASCADE,
  review_pacing_preset_id bigint REFERENCES public.review_pacing_presets(id) ON DELETE SET NULL,
  desired_retention_override integer,
  learning_steps_override text[],
  relearning_steps_override text[],
  has_max_reviews_override boolean NOT NULL DEFAULT false,
  max_reviews_per_day_override integer,
  has_max_new_override boolean NOT NULL DEFAULT false,
  max_new_per_day_override integer
);

ALTER TABLE public.deck_review_pacing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read and write their own decks' pacing"
ON public.deck_review_pacing
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.decks d WHERE d.id = deck_id AND d.member_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.decks d WHERE d.id = deck_id AND d.member_id = auth.uid()
));

-- Backfill: carry every deck's existing preset link + retention/step
-- overrides across, and translate its study_config daily-limit numbers
-- (non-null = an explicit cap was set) into the new override columns.
INSERT INTO public.deck_review_pacing (
  deck_id,
  review_pacing_preset_id,
  desired_retention_override,
  learning_steps_override,
  relearning_steps_override,
  has_max_reviews_override,
  max_reviews_per_day_override,
  has_max_new_override,
  max_new_per_day_override
)
SELECT
  d.id,
  d.review_pacing_preset_id,
  d.desired_retention_override,
  d.learning_steps_override,
  d.relearning_steps_override,
  (d.study_config->>'max_reviews_per_day') IS NOT NULL,
  (d.study_config->>'max_reviews_per_day')::integer,
  (d.study_config->>'max_new_per_day') IS NOT NULL,
  (d.study_config->>'max_new_per_day')::integer
FROM public.decks d;

UPDATE public.decks
SET study_config = study_config - 'max_reviews_per_day' - 'max_new_per_day';

ALTER TABLE public.decks
  DROP COLUMN review_pacing_preset_id,
  DROP COLUMN desired_retention_override,
  DROP COLUMN learning_steps_override,
  DROP COLUMN relearning_steps_override;

COMMIT;
