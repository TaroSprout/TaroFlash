-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.find_orphan_storage_objects(p_older_than interval DEFAULT '01:00:00'::interval, p_limit integer DEFAULT 500) RETURNS TABLE(bucket text, name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'storage'
    AS $$
  SELECT o.bucket_id, o.name
  FROM storage.objects o
  WHERE o.bucket_id IN (SELECT DISTINCT m.bucket FROM public.media m)
    AND o.created_at < now() - p_older_than
    AND NOT EXISTS (
      SELECT 1
      FROM public.media m
      WHERE m.bucket = o.bucket_id
        AND m.path = o.name
    )
  LIMIT p_limit;
$$;


ALTER FUNCTION public.find_orphan_storage_objects(p_older_than interval, p_limit integer) OWNER TO postgres;


REVOKE ALL ON FUNCTION public.find_orphan_storage_objects(p_older_than interval, p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.find_orphan_storage_objects(p_older_than interval, p_limit integer) TO service_role;

