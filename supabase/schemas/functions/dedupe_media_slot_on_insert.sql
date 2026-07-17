-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.dedupe_media_slot_on_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.card_id IS NOT NULL AND NEW.slot IS NOT NULL THEN
    UPDATE public.media
    SET deleted_at = now()
    WHERE card_id = NEW.card_id
      AND slot = NEW.slot
      AND deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.dedupe_media_slot_on_insert() OWNER TO postgres;


GRANT ALL ON FUNCTION public.dedupe_media_slot_on_insert() TO anon;
GRANT ALL ON FUNCTION public.dedupe_media_slot_on_insert() TO authenticated;
GRANT ALL ON FUNCTION public.dedupe_media_slot_on_insert() TO service_role;

