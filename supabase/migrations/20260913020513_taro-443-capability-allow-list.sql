-- knowledge: capabilities, capability_grants, capability_is_live, capability_grants_pkey — corpus/authz/capabilities.md

  create table "public"."capability_grants" (
    "key" text not null,
    "member_id" uuid not null,
    "granted_by" uuid,
    "granted_at" timestamp with time zone not null default now()
      );


alter table "public"."capability_grants" enable row level security;

alter table "public"."capabilities" drop column "targeting";

CREATE UNIQUE INDEX capability_grants_pkey ON public.capability_grants USING btree (key, member_id);

alter table "public"."capability_grants" add constraint "capability_grants_pkey" PRIMARY KEY using index "capability_grants_pkey";

alter table "public"."capability_grants" add constraint "capability_grants_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES public.members(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."capability_grants" validate constraint "capability_grants_granted_by_fkey";

alter table "public"."capability_grants" add constraint "capability_grants_key_fkey" FOREIGN KEY (key) REFERENCES public.capabilities(key) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."capability_grants" validate constraint "capability_grants_key_fkey";

alter table "public"."capability_grants" add constraint "capability_grants_member_id_fkey" FOREIGN KEY (member_id) REFERENCES public.members(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."capability_grants" validate constraint "capability_grants_member_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.capability_is_live(p_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (
      select case state
        when 'on' then true
        when 'targeted' then exists (
          select 1 from public.capability_grants
          where key = p_key
            and member_id = ( select public.active_member_id() )
        )
        else false
      end
      from public.capabilities where key = p_key
    ),
    false
  )
$function$
;

revoke all on function public.capability_is_live(p_key text) from public;
revoke all on function public.capability_is_live(p_key text) from anon;
grant all on function public.capability_is_live(p_key text) to authenticated;
grant all on function public.capability_is_live(p_key text) to service_role;

grant delete on table "public"."capability_grants" to "anon";

grant insert on table "public"."capability_grants" to "anon";

grant references on table "public"."capability_grants" to "anon";

grant select on table "public"."capability_grants" to "anon";

grant trigger on table "public"."capability_grants" to "anon";

grant truncate on table "public"."capability_grants" to "anon";

grant update on table "public"."capability_grants" to "anon";

grant delete on table "public"."capability_grants" to "authenticated";

grant insert on table "public"."capability_grants" to "authenticated";

grant references on table "public"."capability_grants" to "authenticated";

grant select on table "public"."capability_grants" to "authenticated";

grant trigger on table "public"."capability_grants" to "authenticated";

grant truncate on table "public"."capability_grants" to "authenticated";

grant update on table "public"."capability_grants" to "authenticated";

grant delete on table "public"."capability_grants" to "service_role";

grant insert on table "public"."capability_grants" to "service_role";

grant references on table "public"."capability_grants" to "service_role";

grant select on table "public"."capability_grants" to "service_role";

grant trigger on table "public"."capability_grants" to "service_role";

grant truncate on table "public"."capability_grants" to "service_role";

grant update on table "public"."capability_grants" to "service_role";


  create policy "admins can delete capability grants"
  on "public"."capability_grants"
  as permissive
  for delete
  to authenticated
using (public.can_manage_capabilities());



  create policy "admins can insert capability grants"
  on "public"."capability_grants"
  as permissive
  for insert
  to authenticated
with check (public.can_manage_capabilities());



  create policy "admins can read all capability grants"
  on "public"."capability_grants"
  as permissive
  for select
  to authenticated
using (public.can_manage_capabilities());



  create policy "members can read own capability grants"
  on "public"."capability_grants"
  as permissive
  for select
  to authenticated
using ((member_id = ( SELECT public.active_member_id() AS active_member_id)));



