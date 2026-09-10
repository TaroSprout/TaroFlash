-- knowledge: capability_switches, capability_state, capability_is_live, can_manage_capabilities — corpus/authz/capability-switches.md

create type "public"."capability_state" as enum ('off', 'on', 'targeted');


  create table "public"."capability_switches" (
    "key" text not null,
    "state" public.capability_state not null default 'off'::public.capability_state,
    "targeting" jsonb,
    "updated_by" uuid,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."capability_switches" enable row level security;

CREATE UNIQUE INDEX capability_switches_pkey ON public.capability_switches USING btree (key);

alter table "public"."capability_switches" add constraint "capability_switches_pkey" PRIMARY KEY using index "capability_switches_pkey";

alter table "public"."capability_switches" add constraint "capability_switches_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.members(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."capability_switches" validate constraint "capability_switches_updated_by_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_manage_capabilities()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select auth_role() = 'admin'
$function$
;

CREATE OR REPLACE FUNCTION public.capability_is_live(p_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select state = 'on' from public.capability_switches where key = p_key),
    false
  )
$function$
;

-- db diff emits no function grants, so hand-write them (see supabase rule).
-- capability_is_live is SECURITY DEFINER: revoke from PUBLIC so it is not
-- anon-executable (pgTAP 00043 guard); can_manage_capabilities follows the
-- can_ convention of REVOKE-from-PUBLIC then grant the client roles.
revoke all on function public.can_manage_capabilities() from public;
grant all on function public.can_manage_capabilities() to authenticated;
grant all on function public.can_manage_capabilities() to service_role;

revoke all on function public.capability_is_live(text) from public;
revoke all on function public.capability_is_live(text) from anon;
grant all on function public.capability_is_live(text) to authenticated;
grant all on function public.capability_is_live(text) to service_role;

grant delete on table "public"."capability_switches" to "anon";

grant insert on table "public"."capability_switches" to "anon";

grant references on table "public"."capability_switches" to "anon";

grant select on table "public"."capability_switches" to "anon";

grant trigger on table "public"."capability_switches" to "anon";

grant truncate on table "public"."capability_switches" to "anon";

grant update on table "public"."capability_switches" to "anon";

grant delete on table "public"."capability_switches" to "authenticated";

grant insert on table "public"."capability_switches" to "authenticated";

grant references on table "public"."capability_switches" to "authenticated";

grant select on table "public"."capability_switches" to "authenticated";

grant trigger on table "public"."capability_switches" to "authenticated";

grant truncate on table "public"."capability_switches" to "authenticated";

grant update on table "public"."capability_switches" to "authenticated";

grant delete on table "public"."capability_switches" to "service_role";

grant insert on table "public"."capability_switches" to "service_role";

grant references on table "public"."capability_switches" to "service_role";

grant select on table "public"."capability_switches" to "service_role";

grant trigger on table "public"."capability_switches" to "service_role";

grant truncate on table "public"."capability_switches" to "service_role";

grant update on table "public"."capability_switches" to "service_role";


  create policy "admins can delete capability switches"
  on "public"."capability_switches"
  as permissive
  for delete
  to authenticated
using (public.can_manage_capabilities());



  create policy "admins can insert capability switches"
  on "public"."capability_switches"
  as permissive
  for insert
  to authenticated
with check (public.can_manage_capabilities());



  create policy "admins can update capability switches"
  on "public"."capability_switches"
  as permissive
  for update
  to authenticated
using (public.can_manage_capabilities())
with check (public.can_manage_capabilities());



  create policy "members can read capability switches"
  on "public"."capability_switches"
  as permissive
  for select
  to authenticated
using (true);



