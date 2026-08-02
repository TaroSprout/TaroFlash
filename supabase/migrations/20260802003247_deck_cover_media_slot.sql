-- Add a `deck_cover` slot to media so a deck's custom cover image is tracked
-- media (reaped by cleanup-media on replace/remove/deck-delete), alongside the
-- existing card-face slots.
--
-- migra regenerates this enum change as a rename + recreate of the type, which
-- fails because the `cards_with_images` view depends on `media.slot`. Adding the
-- value in place sidesteps the column/view dependency entirely.
alter type "public"."media_slot" add value if not exists 'deck_cover';

-- One active cover per deck: a replace soft-deletes the prior row (via the
-- dedupe trigger below), and this partial unique index enforces the invariant.
-- Mirrors media_card_slot_active_uniq; card rows carry a null deck_id and are
-- excluded by the WHERE.
CREATE UNIQUE INDEX media_deck_slot_active_uniq ON public.media USING btree (deck_id, slot) WHERE ((deleted_at IS NULL) AND (deck_id IS NOT NULL));

set check_function_bodies = off;

-- Extend the slot-dedupe trigger to cover deck-keyed media the same way it
-- already handles card-keyed media: on insert, soft-delete any prior active row
-- for the same deck + slot.
CREATE OR REPLACE FUNCTION public.dedupe_media_slot_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.card_id IS NOT NULL AND NEW.slot IS NOT NULL THEN
    UPDATE public.media
    SET deleted_at = now()
    WHERE card_id = NEW.card_id
      AND slot = NEW.slot
      AND deleted_at IS NULL;
  END IF;

  IF NEW.deck_id IS NOT NULL AND NEW.slot IS NOT NULL THEN
    UPDATE public.media
    SET deleted_at = now()
    WHERE deck_id = NEW.deck_id
      AND slot = NEW.slot
      AND deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$function$
;
