-- knowledge: capabilities, capability_state, capability_is_live, can_manage_capabilities — corpus/authz/capabilities.md

create type "public"."capability_state" as enum ('off', 'on', 'targeted');


  create table "public"."capabilities" (
    "key" text not null,
    "state" public.capability_state not null default 'off'::public.capability_state,
    "targeting" jsonb,
    "updated_by" uuid,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."capabilities" enable row level security;

CREATE UNIQUE INDEX capabilities_pkey ON public.capabilities USING btree (key);

alter table "public"."capabilities" add constraint "capabilities_pkey" PRIMARY KEY using index "capabilities_pkey";

alter table "public"."capabilities" add constraint "capabilities_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.members(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."capabilities" validate constraint "capabilities_updated_by_fkey";

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
    (select state = 'on' from public.capabilities where key = p_key),
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

grant delete on table "public"."capabilities" to "anon";

grant insert on table "public"."capabilities" to "anon";

grant references on table "public"."capabilities" to "anon";

grant select on table "public"."capabilities" to "anon";

grant trigger on table "public"."capabilities" to "anon";

grant truncate on table "public"."capabilities" to "anon";

grant update on table "public"."capabilities" to "anon";

grant delete on table "public"."capabilities" to "authenticated";

grant insert on table "public"."capabilities" to "authenticated";

grant references on table "public"."capabilities" to "authenticated";

grant select on table "public"."capabilities" to "authenticated";

grant trigger on table "public"."capabilities" to "authenticated";

grant truncate on table "public"."capabilities" to "authenticated";

grant update on table "public"."capabilities" to "authenticated";

grant delete on table "public"."capabilities" to "service_role";

grant insert on table "public"."capabilities" to "service_role";

grant references on table "public"."capabilities" to "service_role";

grant select on table "public"."capabilities" to "service_role";

grant trigger on table "public"."capabilities" to "service_role";

grant truncate on table "public"."capabilities" to "service_role";

grant update on table "public"."capabilities" to "service_role";


  create policy "admins can delete capabilities"
  on "public"."capabilities"
  as permissive
  for delete
  to authenticated
using (public.can_manage_capabilities());



  create policy "admins can insert capabilities"
  on "public"."capabilities"
  as permissive
  for insert
  to authenticated
with check (public.can_manage_capabilities());



  create policy "admins can update capabilities"
  on "public"."capabilities"
  as permissive
  for update
  to authenticated
using (public.can_manage_capabilities())
with check (public.can_manage_capabilities());



  create policy "members can read capabilities"
  on "public"."capabilities"
  as permissive
  for select
  to authenticated
using (true);



