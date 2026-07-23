-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE TABLE public.members (
    id uuid NOT NULL,
    display_name text NOT NULL,
    created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    description text,
    avatar_url text,
    email text,
    role public.member_role DEFAULT 'user'::public.member_role NOT NULL,
    plan text DEFAULT 'free'::text NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    cover_config jsonb
);


ALTER TABLE public.members OWNER TO postgres;


ALTER TABLE ONLY public.members
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY (id);


CREATE UNIQUE INDEX members_display_name_key ON public.members (lower(display_name));


ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_stripe_customer_id_key UNIQUE (stripe_customer_id);


ALTER TABLE ONLY public.members
    ADD CONSTRAINT "Users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


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


CREATE FUNCTION public.is_display_name_available(candidate text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select not exists (
    select 1 from public.members
    where lower(display_name) = lower(trim(candidate))
  );
$$;


ALTER FUNCTION public.is_display_name_available(text) OWNER TO postgres;


GRANT EXECUTE ON FUNCTION public.is_display_name_available(text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_display_name_available(text) TO authenticated;


-- Narrow, safe read across the members RLS boundary. SELECT on `members` is
-- restricted to your own row (below), which would blank out other members'
-- profiles anywhere the app legitimately shows them (feedback author,
-- public-deck author). This SECURITY DEFINER helper runs as the owner so it can
-- read any member row, but it only ever projects the public-profile fields —
-- display_name, description, cover_config (banner/theme/avatar) — never email /
-- stripe ids / preferences / role / plan. Invoker functions call it via LATERAL
-- to surface author identity without exposing full rows to arbitrary direct
-- queries.
CREATE TYPE public.member_profile AS (
    display_name text,
    description text,
    cover_config jsonb
);


ALTER TYPE public.member_profile OWNER TO postgres;


CREATE FUNCTION public.member_public_profile(p_member_id uuid) RETURNS SETOF public.member_profile
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT m.display_name, m.description, m.cover_config
  FROM public.members m
  WHERE m.id = p_member_id;
$$;


ALTER FUNCTION public.member_public_profile(uuid) OWNER TO postgres;


GRANT EXECUTE ON FUNCTION public.member_public_profile(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.member_public_profile(uuid) TO authenticated;


ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Enable insert for authenticated users" ON public.members FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


CREATE POLICY "members can read their own row" ON public.members FOR SELECT TO authenticated USING ((auth.uid() = id));


CREATE POLICY "admins can update any member" ON public.members FOR UPDATE TO authenticated USING (public.can_manage_members()) WITH CHECK (public.can_manage_members());


CREATE POLICY "members can update their own non-privileged fields" ON public.members FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK (((auth.uid() = id) AND (role = ( SELECT members_1.role
   FROM public.members members_1
  WHERE (members_1.id = auth.uid()))) AND (plan = ( SELECT members_1.plan
   FROM public.members members_1
  WHERE (members_1.id = auth.uid()))) AND (NOT (stripe_customer_id IS DISTINCT FROM ( SELECT members_1.stripe_customer_id
   FROM public.members members_1
  WHERE (members_1.id = auth.uid())))) AND (NOT (stripe_subscription_id IS DISTINCT FROM ( SELECT members_1.stripe_subscription_id
   FROM public.members members_1
  WHERE (members_1.id = auth.uid()))))));


GRANT ALL ON TABLE public.members TO anon;
GRANT ALL ON TABLE public.members TO authenticated;
GRANT ALL ON TABLE public.members TO service_role;
