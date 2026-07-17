-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.create_member_on_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$begin
  insert into public.members (
    id,
    display_name,
    avatar_url,
    email
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;$$;


ALTER FUNCTION public.create_member_on_new_user() OWNER TO postgres;


GRANT ALL ON FUNCTION public.create_member_on_new_user() TO anon;
GRANT ALL ON FUNCTION public.create_member_on_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.create_member_on_new_user() TO service_role;

