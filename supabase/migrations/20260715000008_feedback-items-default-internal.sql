-- New feedback submissions should stay hidden from the public board until a
-- moderator reviews and flips visibility to 'public' via update_feedback_item.

BEGIN;

ALTER TABLE public.feedback_items
ALTER COLUMN visibility SET DEFAULT 'internal';

COMMIT;
