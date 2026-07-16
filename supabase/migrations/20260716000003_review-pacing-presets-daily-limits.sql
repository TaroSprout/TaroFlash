-- Daily limits (max reviews/new cards per day) join the desired-retention +
-- learning/relearning-steps trio as fields a preset can carry. Nullable, same
-- "null = unbounded" convention decks.study_config.max_*_per_day already
-- used — the system preset stays null/null so behavior is unchanged for
-- anyone who never touched a deck's daily limits.

BEGIN;

ALTER TABLE public.review_pacing_presets
  ADD COLUMN max_reviews_per_day integer,
  ADD COLUMN max_new_per_day integer;

COMMIT;
