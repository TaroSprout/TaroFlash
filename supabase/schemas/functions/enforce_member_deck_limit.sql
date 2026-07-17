-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.enforce_member_deck_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_limit int;
  v_count int;
BEGIN
  IF NEW.id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.deck_limit
    INTO v_limit
    FROM public.members m
    JOIN public.plans   p ON p.id = m.plan
   WHERE m.id = auth.uid();

  IF v_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
    FROM public.decks
   WHERE public.decks.member_id = auth.uid();

  IF v_count + 1 > v_limit THEN
    RAISE EXCEPTION 'deck_limit_exceeded'
      USING ERRCODE = 'PT402',
            DETAIL  = format('Plan allows max %s decks', v_limit);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.enforce_member_deck_limit() OWNER TO postgres;


GRANT ALL ON FUNCTION public.enforce_member_deck_limit() TO anon;
GRANT ALL ON FUNCTION public.enforce_member_deck_limit() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_member_deck_limit() TO service_role;

