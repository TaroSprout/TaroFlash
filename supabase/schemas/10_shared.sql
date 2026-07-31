-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE TYPE public.member_role AS ENUM (
    'user',
    'moderator',
    'admin'
);


ALTER TYPE public.member_role OWNER TO postgres;


CREATE FUNCTION public.auth_plan() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select plan from public.members where id = auth.uid()
$$;


ALTER FUNCTION public.auth_plan() OWNER TO postgres;


GRANT ALL ON FUNCTION public.auth_plan() TO anon;
GRANT ALL ON FUNCTION public.auth_plan() TO authenticated;
GRANT ALL ON FUNCTION public.auth_plan() TO service_role;


-- The suspend primitive. Returns the caller's member id normally, and NULL once
-- their account is pending deletion (members.delete_at IS NOT NULL).
--
-- Ownership policies compare against this instead of auth.uid() directly. When
-- it returns NULL, `NULL = member_id` evaluates to NULL — which RLS treats as
-- false — so every member-owned row disappears from every table at once. That
-- is what "data is no longer processed" means in practice, and it holds without
-- bolting an extra condition onto ~30 separate policies (any one of which could
-- later be forgotten). A policy still on plain auth.uid() is visibly unswept.
--
-- STABLE, and every call site wraps it as `( SELECT public.active_member_id() )`
-- so the planner hoists it into an InitPlan and evaluates it once per query
-- rather than once per row — the same trick the existing policies use with
-- `( SELECT auth.uid() AS uid )`. Without the wrapper, every sequential scan in
-- the app picks up a per-row lookup against `members`.
--
-- DELIBERATELY NOT USED BY: the `members` SELECT policy (a pending member must
-- still read their own row, or they can't see the pending state or restore),
-- restore_account() (it exists to un-suspend, so it must work while suspended),
-- and the admin policies.
CREATE FUNCTION public.active_member_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select id from public.members
  where id = auth.uid()
    and delete_at is null
$$;


ALTER FUNCTION public.active_member_id() OWNER TO postgres;


GRANT ALL ON FUNCTION public.active_member_id() TO anon;
GRANT ALL ON FUNCTION public.active_member_id() TO authenticated;
GRANT ALL ON FUNCTION public.active_member_id() TO service_role;


CREATE FUNCTION public.auth_role() RETURNS public.member_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select role from public.members where id = auth.uid()
$$;


ALTER FUNCTION public.auth_role() OWNER TO postgres;


GRANT ALL ON FUNCTION public.auth_role() TO anon;
GRANT ALL ON FUNCTION public.auth_role() TO authenticated;
GRANT ALL ON FUNCTION public.auth_role() TO service_role;


CREATE FUNCTION public.can_manage_members() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  select auth_role() = 'admin'
$$;


ALTER FUNCTION public.can_manage_members() OWNER TO postgres;


REVOKE ALL ON FUNCTION public.can_manage_members() FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_manage_members() TO service_role;
GRANT ALL ON FUNCTION public.can_manage_members() TO authenticated;


CREATE FUNCTION public.can_moderate_feedback() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT auth_role() IN ('admin', 'moderator')
$$;


ALTER FUNCTION public.can_moderate_feedback() OWNER TO postgres;


REVOKE ALL ON FUNCTION public.can_moderate_feedback() FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_moderate_feedback() TO service_role;
GRANT ALL ON FUNCTION public.can_moderate_feedback() TO authenticated;


CREATE FUNCTION public.can_read_lesson_audio() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  select auth_role() = 'admin'
$$;


ALTER FUNCTION public.can_read_lesson_audio() OWNER TO postgres;


REVOKE ALL ON FUNCTION public.can_read_lesson_audio() FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_read_lesson_audio() TO service_role;
GRANT ALL ON FUNCTION public.can_read_lesson_audio() TO authenticated;


CREATE FUNCTION public.set_member_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  new.member_id := auth.uid();
  return new;
end;
$$;


ALTER FUNCTION public.set_member_id() OWNER TO postgres;


GRANT ALL ON FUNCTION public.set_member_id() TO anon;
GRANT ALL ON FUNCTION public.set_member_id() TO authenticated;
GRANT ALL ON FUNCTION public.set_member_id() TO service_role;


GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


COMMENT ON SCHEMA public IS 'standard public schema';
