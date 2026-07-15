-- Seed the feedback board with the roadmap items from the welcome page, all
-- pre-accepted and public. Attributed to an admin member since there's no
-- "system" member to own reference data. Guarded by title so this stays
-- idempotent if migrations are ever re-run.
--
-- A fresh database (CI, a new environment) has no members at all yet, so
-- there's nothing to attribute seeded items to — skip with a NOTICE rather
-- than failing the whole migration run. Environments that already have an
-- admin (local dev, stage, prod) get seeded as normal.

BEGIN;

DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM public.members WHERE role = 'admin' ORDER BY created_at LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'No admin member found yet — skipping feedback board seed';
    RETURN;
  END IF;

  -- set_member_id (BEFORE INSERT) stamps member_id from auth.uid(), which is
  -- null in this session — disable it so the explicit v_admin_id sticks.
  ALTER TABLE public.feedback_items DISABLE TRIGGER set_member_id_on_feedback_item;

  INSERT INTO public.feedback_items (member_id, title, body, type, status, visibility)
  SELECT v_admin_id, title, body, type, 'accepted', 'public'
  FROM (VALUES
    (
      'Import & Export Decks',
      'Import/export support for common flashcard formats so switching tools doesn''t mean losing your decks.',
      'idea'::feedback_type
    ),
    (
      'Card Audio Upload',
      'Add sound to your cards — perfect for language decks, music theory, or anything that needs to be heard, not just read.',
      'idea'::feedback_type
    ),
    (
      'Share Decks with the Community',
      'A community hub where members browse, save, and study each other''s public decks.',
      'idea'::feedback_type
    ),
    (
      'Challenges',
      'Complete daily/weekly challenges to earn bonus rewards on top of normal study.',
      'idea'::feedback_type
    ),
    (
      'Collect Rewards for Everything You Do',
      'Rewards for both big milestones and small daily actions, so there''s always something to work toward.',
      'idea'::feedback_type
    ),
    (
      'Paperclips & a Shop to Spend Them In',
      'Paperclips are the in-app currency — earn them, then spend on shop items.',
      'idea'::feedback_type
    )
  ) AS seed(title, body, type)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.feedback_items f WHERE f.title = seed.title
  );

  ALTER TABLE public.feedback_items ENABLE TRIGGER set_member_id_on_feedback_item;
END $$;

COMMIT;
