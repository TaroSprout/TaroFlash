-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
--
-- Loads after 20_members.sql: updated_by is an FK to members.
SET check_function_bodies = false;

CREATE TYPE public.capability_state AS ENUM (
    'off',
    'on',
    'targeted'
);


ALTER TYPE public.capability_state OWNER TO postgres;


-- Runtime capabilities an admin can flip without a deploy; the seeded row is the baseline.
CREATE TABLE public.capabilities (
    key text NOT NULL,
    state public.capability_state DEFAULT 'off'::public.capability_state NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.capabilities OWNER TO postgres;


ALTER TABLE ONLY public.capabilities
    ADD CONSTRAINT capabilities_pkey PRIMARY KEY (key);


ALTER TABLE ONLY public.capabilities
    ADD CONSTRAINT capabilities_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.members(id) ON UPDATE CASCADE ON DELETE SET NULL;


ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members can read capabilities" ON public.capabilities FOR SELECT TO authenticated USING (true);


CREATE POLICY "admins can insert capabilities" ON public.capabilities FOR INSERT TO authenticated WITH CHECK (public.can_manage_capabilities());


CREATE POLICY "admins can update capabilities" ON public.capabilities FOR UPDATE TO authenticated USING (public.can_manage_capabilities()) WITH CHECK (public.can_manage_capabilities());


CREATE POLICY "admins can delete capabilities" ON public.capabilities FOR DELETE TO authenticated USING (public.can_manage_capabilities());


GRANT ALL ON TABLE public.capabilities TO anon;
GRANT ALL ON TABLE public.capabilities TO authenticated;
GRANT ALL ON TABLE public.capabilities TO service_role;


-- The allow-list behind a `targeted` capability: one row per member granted a
-- feature. granted_by/granted_at record who granted it and when — a grant is
-- granted once, not updated, so the audit names differ from capabilities' own
-- updated_by/updated_at.
CREATE TABLE public.capability_grants (
    key text NOT NULL,
    member_id uuid NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.capability_grants OWNER TO postgres;


ALTER TABLE ONLY public.capability_grants
    ADD CONSTRAINT capability_grants_pkey PRIMARY KEY (key, member_id);


ALTER TABLE ONLY public.capability_grants
    ADD CONSTRAINT capability_grants_key_fkey FOREIGN KEY (key) REFERENCES public.capabilities(key) ON UPDATE CASCADE ON DELETE CASCADE;


ALTER TABLE ONLY public.capability_grants
    ADD CONSTRAINT capability_grants_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON UPDATE CASCADE ON DELETE CASCADE;


ALTER TABLE ONLY public.capability_grants
    ADD CONSTRAINT capability_grants_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.members(id) ON UPDATE CASCADE ON DELETE SET NULL;


ALTER TABLE public.capability_grants ENABLE ROW LEVEL SECURITY;


-- Tighter than capabilities' read-all-authenticated: an allow-list must not leak
-- its membership, so a member reads only their own entries.
CREATE POLICY "members can read own capability grants" ON public.capability_grants FOR SELECT TO authenticated USING (member_id = ( SELECT public.active_member_id() ));


CREATE POLICY "admins can read all capability grants" ON public.capability_grants FOR SELECT TO authenticated USING (public.can_manage_capabilities());


CREATE POLICY "admins can insert capability grants" ON public.capability_grants FOR INSERT TO authenticated WITH CHECK (public.can_manage_capabilities());


CREATE POLICY "admins can delete capability grants" ON public.capability_grants FOR DELETE TO authenticated USING (public.can_manage_capabilities());


GRANT ALL ON TABLE public.capability_grants TO anon;
GRANT ALL ON TABLE public.capability_grants TO authenticated;
GRANT ALL ON TABLE public.capability_grants TO service_role;


-- The admin allow-list read: every granted member's display fields for one
-- capability. SECURITY DEFINER so it can join members past their own-row RLS —
-- a plain select embedding members would blank every row but the caller's — and
-- gated inside the query on can_manage_capabilities() so a non-admin caller
-- matches zero rows instead.
CREATE FUNCTION public.list_capability_grants(p_key text) RETURNS TABLE(id uuid, display_name text, avatar_url text, granted_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select m.id, m.display_name, m.avatar_url, g.granted_at
  from public.capability_grants g
  join public.members m on m.id = g.member_id
  where g.key = p_key
    and public.can_manage_capabilities()
  order by g.granted_at asc, m.display_name asc
$$;


ALTER FUNCTION public.list_capability_grants(p_key text) OWNER TO postgres;


-- SECURITY DEFINER, so not left executable by anon (guarded by pgTAP
-- 00043_definer_function_anon_grants).
REVOKE ALL ON FUNCTION public.list_capability_grants(p_key text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_capability_grants(p_key text) FROM anon;
GRANT ALL ON FUNCTION public.list_capability_grants(p_key text) TO authenticated;
GRANT ALL ON FUNCTION public.list_capability_grants(p_key text) TO service_role;
