-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
--
-- The capability row itself. Loads after 20_members.sql because updated_by is an FK
-- to members; the functions that read and gate it (capability_is_live,
-- can_manage_capabilities) live in 10_shared.sql alongside auth_role/auth_plan,
-- which likewise read a members-backed row from before members is declared.
SET check_function_bodies = false;

CREATE TYPE public.capability_state AS ENUM (
    'off',
    'on',
    'targeted'
);


ALTER TYPE public.capability_state OWNER TO postgres;


-- Runtime capabilities an admin can flip without a deploy, read the same way the app
-- reads plan and role. The seeded row is the baseline — there is no separate
-- baseline column, so the row's own `state` is what reads until an admin changes
-- it. `targeted` and the `targeting` slot are reserved for later cohort work and
-- unreachable in v1 (writes only ever set off/on).
CREATE TABLE public.capabilities (
    key text NOT NULL,
    state public.capability_state DEFAULT 'off'::public.capability_state NOT NULL,
    targeting jsonb,
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
