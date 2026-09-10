-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
--
-- The switch row itself. Loads after 20_members.sql because updated_by is an FK
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


-- Runtime switches an admin can flip without a deploy, read the same way the app
-- reads plan and role. The seeded row is the baseline — there is no separate
-- baseline column, so the row's own `state` is what reads until an admin changes
-- it. `targeted` and the `targeting` slot are reserved for later cohort work and
-- unreachable in v1 (writes only ever set off/on).
CREATE TABLE public.capability_switches (
    key text NOT NULL,
    state public.capability_state DEFAULT 'off'::public.capability_state NOT NULL,
    targeting jsonb,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.capability_switches OWNER TO postgres;


ALTER TABLE ONLY public.capability_switches
    ADD CONSTRAINT capability_switches_pkey PRIMARY KEY (key);


ALTER TABLE ONLY public.capability_switches
    ADD CONSTRAINT capability_switches_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.members(id) ON UPDATE CASCADE ON DELETE SET NULL;


ALTER TABLE public.capability_switches ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members can read capability switches" ON public.capability_switches FOR SELECT TO authenticated USING (true);


CREATE POLICY "admins can insert capability switches" ON public.capability_switches FOR INSERT TO authenticated WITH CHECK (public.can_manage_capabilities());


CREATE POLICY "admins can update capability switches" ON public.capability_switches FOR UPDATE TO authenticated USING (public.can_manage_capabilities()) WITH CHECK (public.can_manage_capabilities());


CREATE POLICY "admins can delete capability switches" ON public.capability_switches FOR DELETE TO authenticated USING (public.can_manage_capabilities());


GRANT ALL ON TABLE public.capability_switches TO anon;
GRANT ALL ON TABLE public.capability_switches TO authenticated;
GRANT ALL ON TABLE public.capability_switches TO service_role;
