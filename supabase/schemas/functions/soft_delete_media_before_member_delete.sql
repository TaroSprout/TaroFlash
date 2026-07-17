-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.soft_delete_media_before_member_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE public.media
  SET deleted_at = now()
  WHERE member_id = OLD.id
    AND deleted_at IS NULL;

  RETURN OLD;
END;
$$;


ALTER FUNCTION public.soft_delete_media_before_member_delete() OWNER TO postgres;


GRANT ALL ON FUNCTION public.soft_delete_media_before_member_delete() TO anon;
GRANT ALL ON FUNCTION public.soft_delete_media_before_member_delete() TO authenticated;
GRANT ALL ON FUNCTION public.soft_delete_media_before_member_delete() TO service_role;

