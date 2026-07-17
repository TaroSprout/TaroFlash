-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.delete_deck(p_deck_id bigint) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.decks
    WHERE public.decks.id = p_deck_id AND public.decks.member_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Deck not found or not owned by user';
  END IF;

  -- Tombstone every media row tied to this deck so cleanup-media can reap
  -- the storage objects. Detach the FK columns so the deck delete below
  -- isn't blocked by media_card_id_fkey / media_deck_id_fkey.
  --
  -- Includes rows already soft-deleted: their `deleted_at` is preserved
  -- (COALESCE keeps the original tombstone time so cleanup-media's batching
  -- stays accurate), but their FK columns still need NULLing or the
  -- cascading DELETE below would trip on them.
  UPDATE public.media
     SET deleted_at = COALESCE(deleted_at, now()),
         card_id    = NULL,
         deck_id    = NULL
   WHERE deck_id = p_deck_id
      OR card_id IN (SELECT id FROM public.cards WHERE deck_id = p_deck_id);

  DELETE FROM public.decks WHERE id = p_deck_id;
END;
$$;


ALTER FUNCTION public.delete_deck(p_deck_id bigint) OWNER TO postgres;


GRANT ALL ON FUNCTION public.delete_deck(p_deck_id bigint) TO anon;
GRANT ALL ON FUNCTION public.delete_deck(p_deck_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.delete_deck(p_deck_id bigint) TO service_role;

