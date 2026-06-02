-- =============================================================================
-- Harden the media soft-delete triggers so parent deletes never FK-block
-- =============================================================================
--
-- media.card_id -> cards and media.deck_id -> decks are NO ACTION, so before a
-- card/deck row is deleted its BEFORE DELETE trigger must clear that column on
-- every media row pointing at it. Two latent bugs surfaced once account
-- deletion started cascading auth.users -> members -> decks -> cards
-- (20260601000001) — before that, auth-user deletion was blocked outright and
-- the cascade never ran:
--
-- 1. soft_delete_media_before_card_delete referenced `media` UNQUALIFIED, so it
--    broke under roles whose search_path lacks public — notably
--    supabase_auth_admin, which runs the cascade on auth-user deletion:
--      "relation media does not exist".
--    (Its deck/member siblings already qualify public.media.)
--
-- 2. Both the card and deck triggers only touched rows WHERE deleted_at IS NULL,
--    so an already soft-deleted media row kept its card_id/deck_id and then
--    FK-blocked the parent delete:
--      "update or delete on table cards violates media_card_id_fkey".
--
-- Fix: fully qualify public.media, and clear the FK column for ALL referencing
-- media regardless of deleted_at. COALESCE(deleted_at, now()) stamps still-live
-- rows for the cleanup-media cron while preserving an existing soft-delete time.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_media_before_card_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.media
  SET
    deleted_at = COALESCE(deleted_at, now()),
    card_id    = NULL
  WHERE card_id = OLD.id;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_media_before_deck_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.media
  SET
    deleted_at = COALESCE(deleted_at, now()),
    deck_id    = NULL
  WHERE deck_id = OLD.id;

  RETURN OLD;
END;
$$;
